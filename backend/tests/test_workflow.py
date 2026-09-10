"""Run with .venv/bin/python -m unittest discover -s tests -v.

Uses a new PostgreSQL schema for each test; never modifies demo records.
"""
import io
import json
import logging
import os
import tempfile
import time
import unittest
import uuid
from collections import deque
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient
from google import genai
from google.genai import types
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker

from app import ai, routes
from app.auth import COOKIE, ORIGIN, digest, passwords
from app.db import Base, DATABASE_URL, engine, get_db, now
from app.main import app
from app.models import Activity, AuthAttempt, Challenge, Organization, Session, User
from app.schemas import CHAT_ANSWER_MAX

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("sih").setLevel(logging.ERROR)
REPORT = {"title": "Safe drinking water for our village", "description": "PRIVATE NAME AND ADDRESS: Community members need reliable clean water throughout the summer months.", "submitter_type": "community", "district": "Ranchi", "locality": "PRIVATE EXACT LOCALITY", "latitude": 23.36, "longitude": 85.33}
REVIEW = {"decision": "validate", "note": "Reviewed and safely summarized.", "domain": "water", "priority": "high", "public_title_en": "Community drinking water access", "public_title_hi": "समुदाय के लिए पेयजल", "summary_en": "Households need access to safe water during seasonal shortages.", "summary_hi": "मौसमी कमी के दौरान परिवारों को सुरक्षित पानी की आवश्यकता है।"}


class WorkflowTest(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        engine.dispose()

    def setUp(self):
        routes.CHAT_ATTEMPTS.clear()
        self.schema = "test_" + uuid.uuid4().hex
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{self.schema}"'))
        self.test_engine = create_engine(DATABASE_URL).execution_options(schema_translate_map={None: self.schema})
        Base.metadata.create_all(self.test_engine)
        self.sessions = sessionmaker(self.test_engine, expire_on_commit=False)

        def test_db():
            with self.sessions() as db:
                try:
                    yield db
                    db.commit()
                except Exception:
                    db.rollback()
                    raise

        app.dependency_overrides[get_db] = test_db
        self.files = tempfile.TemporaryDirectory()
        self.file_patch = patch("app.routes.UPLOAD_DIR", Path(self.files.name))
        self.file_patch.start()
        self.clients = []
        self.ids = {}
        with self.sessions.begin() as db:
            for role in ("government", "university", "university2", "industry", "industry2"):
                kind = role.rstrip("2")
                org = None
                if kind in ("university", "industry"):
                    org = Organization(name="Test " + role, kind=kind, district="Ranchi", domains=["water"], expertise="Water engineering and field testing", facilities="Testing laboratory")
                    db.add(org)
                    db.flush()
                    self.ids[role] = org.id
                db.add(User(email=f"{role}@test.local", name="Test " + role, role=kind, organization_id=org.id if org else None, password_hash=passwords.hash("TestPassword123!")))
        self.gov = self.login("government")
        self.uni = self.login("university")
        self.uni2 = self.login("university2")
        self.industry = self.login("industry")
        self.industry2 = self.login("industry2")
        self.citizen = self.client()
        self.request(self.citizen, "POST", "/auth/register", {"name": "Citizen One", "email": "citizen@test.local", "password": "TestPassword123!"}, 201)
        self.other = self.client()
        self.request(self.other, "POST", "/auth/register", {"name": "Citizen Two", "email": "other@test.local", "password": "TestPassword123!"}, 201)
        self.public = self.client()

    def tearDown(self):
        for client in self.clients:
            client.close()
        self.file_patch.stop()
        self.files.cleanup()
        app.dependency_overrides.clear()
        self.test_engine.dispose()
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{self.schema}" CASCADE'))

    def client(self):
        client = TestClient(app, base_url=ORIGIN, headers={"Origin": ORIGIN})
        self.clients.append(client)
        return client

    def request(self, client, method, path, body=None, status=200):
        response = client.request(method, "/api/v1" + path, **({"json": body} if body is not None else {}))
        self.assertEqual(response.status_code, status, f"{method} {path}: {response.text}")
        return response.json() if response.content else None

    def login(self, role):
        client = self.client()
        self.request(client, "POST", "/auth/login", {"email": role + "@test.local", "password": "TestPassword123!"})
        return client

    def create(self):
        return self.request(self.citizen, "POST", "/challenges", REPORT, 201)["id"]

    def allocate(self, cid):
        self.request(self.gov, "POST", f"/challenges/{cid}/review", REVIEW)
        self.request(self.gov, "POST", f"/challenges/{cid}/assign", {"university_id": self.ids["university"]})
        return self.request(self.uni, "POST", f"/challenges/{cid}/assignment", {"decision": "accept"})["project_id"]

    def test_full_lifecycle_and_access_boundaries(self):
        cid = self.create()
        guidance = {"language": "en", "suggested_title": REPORT["title"], "suggested_description": REPORT["description"], "questions": ["How many households are affected?"]}
        with patch("app.routes.ai.generate", return_value=guidance):
            self.assertEqual(self.request(self.citizen, "POST", "/ai/citizen-guidance", {"title": REPORT["title"], "description": REPORT["description"], "district": "Ranchi", "language": "en"})["language"], "en")
            self.request(self.industry, "POST", "/ai/citizen-guidance", {"title": REPORT["title"], "description": REPORT["description"], "district": "Ranchi", "language": "en"}, 403)
        self.request(self.other, "GET", f"/challenges/{cid}", status=404)
        self.request(self.public, "GET", f"/public/challenges/{cid}", status=404)
        self.request(self.citizen, "POST", f"/challenges/{cid}/review", REVIEW, 403)
        project = self.allocate(cid)
        plan = {"language": "en", "approach": "Co-design and test a practical water treatment prototype with community participants.", "duration_weeks": 12, "milestones": [{"title": "Prototype field test", "week": 8}]}
        with patch("app.routes.ai.generate", return_value=plan):
            self.assertEqual(self.request(self.uni, "POST", f"/projects/{project}/ai-plan?language=en", {})["duration_weeks"], 12)
            self.request(self.uni2, "POST", f"/projects/{project}/ai-plan?language=en", {}, 404)
        self.request(self.uni, "POST", f"/challenges/{cid}/assignment", {"decision": "accept"}, 409)
        self.request(self.uni2, "GET", f"/projects/{project}", status=404)
        self.request(self.industry, "GET", f"/projects/{project}", status=404)
        matches = {"matches": [{"challenge_id": cid, "support_kind": "funding", "reason_en": "Relevant water capability.", "reason_hi": "प्रासंगिक जल क्षमता।"}]}
        with patch("app.routes.ai.generate", return_value=matches):
            self.assertEqual(self.request(self.industry, "POST", "/ai/opportunity-matches", {})["matches"][0]["challenge_id"], cid)
            self.request(self.citizen, "POST", "/ai/opportunity-matches", {}, 403)
        public = self.request(self.public, "GET", f"/public/challenges/{cid}")
        for key in ("description", "title", "locality", "latitude", "longitude", "owner_id", "ai_suggestions", "review_note"):
            self.assertNotIn(key, public)
        self.assertNotIn("PRIVATE", str(public))
        offer = self.request(self.industry, "POST", f"/projects/{project}/partnerships", {"kind": "funding", "description": "We commit funding for a pilot water filter.", "amount": 50000}, 201)
        self.request(self.industry, "POST", f"/projects/{project}/partnerships", {"kind": "funding", "description": "A duplicate funding offer for this project.", "amount": 50000}, 409)
        self.request(self.uni2, "POST", f"/partnerships/{offer['id']}/review", {"decision": "accept"}, 404)
        self.request(self.uni, "POST", f"/partnerships/{offer['id']}/review", {"decision": "accept"})
        self.request(self.industry, "GET", f"/projects/{project}")
        self.request(self.industry2, "GET", f"/projects/{project}", status=404)
        proposal = {"approach": "Co-design a water filter with community members, test it and measure access.", "budget": 60000, "duration_weeks": 12}
        self.request(self.uni, "PUT", f"/projects/{project}/proposal", proposal, 400)
        for kind in ("student", "faculty"):
            self.request(self.uni, "POST", f"/projects/{project}/team", {"name": "Test " + kind, "discipline": "Environmental engineering", "kind": kind}, 201)
        self.request(self.uni, "PUT", f"/projects/{project}/proposal", proposal)
        self.request(self.gov, "POST", f"/projects/{project}/proposal/review", {"decision": "request_changes", "note": "Please clarify the testing approach."})
        self.request(self.uni, "PUT", f"/projects/{project}/proposal", proposal)
        self.request(self.gov, "POST", f"/projects/{project}/proposal/review", {"decision": "approve", "note": "Testing approach accepted."})
        outcome = {"beneficiaries": 100, "metric": "Water access", "unit": "households", "baseline": 10, "result": 100, "testing_evidence": "Household surveys and filter test results verify improved access.", "patents": 0, "startups": 0}
        self.request(self.uni, "PUT", f"/projects/{project}/outcome", outcome, 409)
        milestone = self.request(self.uni, "POST", f"/projects/{project}/milestones", {"title": "Pilot filter installation", "due_date": "2026-12-01"}, 201)
        mid = milestone["id"]
        self.request(self.industry, "POST", f"/milestones/{mid}/submit", {"evidence": "A partner cannot submit university milestone evidence."}, 403)
        self.request(self.uni, "POST", f"/milestones/{mid}/submit", {"evidence": "Prototype tested with field observations and household interviews."})
        self.request(self.gov, "POST", f"/milestones/{mid}/review", {"decision": "request_changes", "note": "Add more field observations."})
        self.request(self.uni, "POST", f"/milestones/{mid}/submit", {"evidence": "More field observations and household interview data are recorded."})
        self.request(self.gov, "POST", f"/milestones/{mid}/review", {"decision": "approve", "note": "Evidence reviewed and accepted."})
        self.request(self.gov, "POST", f"/milestones/{mid}/review", {"decision": "approve", "note": "Repeated approval must fail."}, 409)
        self.request(self.uni, "PUT", f"/projects/{project}/outcome", outcome)
        with patch("app.routes.ai.generate", side_effect=RuntimeError("provider unavailable")):
            self.assertEqual(self.request(self.gov, "POST", f"/projects/{project}/outcome/analyze", {})["status"], "unavailable")
        self.assertEqual(self.request(self.gov, "GET", f"/projects/{project}")["outcome"]["status"], "submitted")
        assessment = {"recommendation": "approve", "reason_en": "Reported improvement aligns with the approved evidence.", "reason_hi": "रिपोर्ट किया गया सुधार स्वीकृत प्रमाण के अनुरूप है।", "evidence_gaps": [], "metric_observations": ["Baseline and result use the same unit."]}
        with patch("app.routes.ai.generate", return_value=assessment):
            self.assertEqual(self.request(self.gov, "POST", f"/projects/{project}/outcome/analyze", {})["status"], "ready")
            self.request(self.uni, "POST", f"/projects/{project}/outcome/analyze", {}, 403)
        self.assertIsNone(self.request(self.uni, "GET", f"/projects/{project}")["outcome"]["ai_suggestions"])
        self.assertEqual(self.request(self.gov, "GET", f"/projects/{project}")["outcome"]["ai_suggestions"]["recommendation"], "approve")
        self.request(self.gov, "POST", f"/projects/{project}/outcome/review", {"decision": "request_changes", "note": "Clarify the baseline measurement."})
        self.request(self.uni, "PUT", f"/projects/{project}/outcome", outcome)
        self.request(self.gov, "POST", f"/projects/{project}/outcome/review", {"decision": "approve", "note": "Validated against submitted field evidence."})
        self.request(self.citizen, "PUT", f"/projects/{project}/feedback", {"body": "Our community now has reliable water."})
        self.request(self.citizen, "POST", f"/challenges/{cid}/discussion", {"body": "Thank you for working with our community."}, 201)
        final = self.request(self.public, "GET", f"/public/challenges/{cid}")
        self.assertEqual(final["status"], "resolved")
        self.assertEqual(final["beneficiaries"], 100)
        stats = self.request(self.gov, "GET", "/analytics")
        self.assertEqual((stats["resolved"], stats["funding_committed"], stats["completion_rate"]), (1, 50000, 100))
        self.assertEqual(self.request(self.citizen, "GET", "/challenges/summary")["resolved"], 1)
        self.assertEqual(self.request(self.other, "GET", "/challenges/summary")["challenges"], 0)
        notifications = self.request(self.citizen, "GET", "/notifications")
        self.assertTrue(notifications)
        self.request(self.other, "POST", f"/notifications/{notifications[0]['id']}/read", {}, 404)
        self.request(self.citizen, "POST", f"/notifications/{notifications[0]['id']}/read", {})
        with self.sessions() as db:
            self.assertGreater(len(db.scalars(select(Activity).where(Activity.challenge_id == cid)).all()), 12)

    def test_authentication_validation_and_sessions(self):
        self.request(self.public, "POST", "/auth/register", {"name": "Escalation", "email": "attack@test.local", "password": "TestPassword123!", "role": "government"}, 422)
        self.request(self.public, "POST", "/auth/register", {"name": "Too Short", "email": "short@test.local", "password": "short"}, 422)
        response = self.public.post("/api/v1/auth/login", json={"email": "citizen@test.local", "password": "TestPassword123!"}, headers={"Origin": "https://other.example"})
        self.assertEqual(response.status_code, 403)
        self.request(self.public, "POST", "/auth/login", {"email": "citizen@test.local", "password": "wrong"}, 401)
        self.request(self.other, "GET", "/analytics", status=403)
        self.request(self.uni2, "PUT", f"/organizations/{self.ids['university']}", {"domains": ["water"], "expertise": "Should not update another university", "facilities": "Lab"}, 403)
        token = self.citizen.cookies.get(COOKIE)
        with self.sessions.begin() as db:
            session = db.scalar(select(Session).where(Session.token_hash == digest(token)))
            self.assertNotEqual(session.token_hash, token)
            session.expires_at = now() - timedelta(seconds=1)
        self.assertIsNone(self.request(self.citizen, "GET", "/auth/me"))
        self.request(self.citizen, "GET", "/challenges", status=401)
        response = self.citizen.post("/api/v1/auth/login", json={"email": "citizen@test.local", "password": "TestPassword123!"})
        self.assertIn("HttpOnly", response.headers["set-cookie"])
        self.assertIn("SameSite=lax", response.headers["set-cookie"])
        token = self.citizen.cookies.get(COOKIE)
        self.request(self.citizen, "POST", "/auth/logout", {}, 204)
        self.citizen.cookies.set(COOKIE, token)
        self.assertIsNone(self.request(self.citizen, "GET", "/auth/me"))
        self.request(self.citizen, "GET", "/challenges", status=401)
        for _ in range(16):
            last = self.public.post("/api/v1/auth/login", json={"email": "rate@test.local", "password": "wrong"})
        self.assertEqual(last.status_code, 429)

    def test_advisor_chat_public_ai_fallback_and_limits(self):
        request = {"message": "What information stays private?", "language": "en", "page": "home", "history": []}
        with patch("app.routes.ai.generate", side_effect=AssertionError("public chat must not call Gemini")):
            public = self.request(self.public, "POST", "/ai/chat", request)
        self.assertEqual((public["source"], public["language"]), ("curated", "en"))
        self.assertIn("exact locations", public["answer"])
        self.request(self.public, "POST", "/ai/chat", {**request, "page": "invented"}, 422)
        self.request(self.public, "POST", "/ai/chat", {**request, "role": "government"}, 422)
        self.request(self.public, "POST", "/ai/chat", {**request, "history": [{"role": "user", "content": "question"}] * 7}, 422)

        generated = {"language": "en", "answer": "AI drafts advice, while authorized people make every decision.", "suggestions": ["How does review work?"]}
        private_request = {
            "message": "How does AI help? Contact private@example.com or +919876543210.",
            "language": "en",
            "page": "workspace",
            "history": [{"role": "user", "content": "The coordinates are 23.3600, 85.3300."}],
        }
        with patch("app.routes.ai.generate", return_value=generated) as generate:
            response = self.request(self.citizen, "POST", "/ai/chat", private_request)
        self.assertEqual(response["source"], "ai")
        sent = generate.call_args.args[0]
        self.assertEqual(set(sent), {"language", "role", "page", "message", "history", "portal_facts"})
        self.assertEqual(sent["role"], "citizen")
        serialized = json.dumps(sent)
        for private in ("Citizen One", "citizen@test.local", "private@example.com", "+919876543210", "23.3600", "85.3300"):
            self.assertNotIn(private, serialized)

        with patch("app.routes.ai.generate", return_value={**generated, "language": "hi"}):
            fallback = self.request(self.citizen, "POST", "/ai/chat", request)
        self.assertEqual(fallback["source"], "curated")
        with patch("app.routes.ai.generate", side_effect=RuntimeError("provider unavailable")):
            fallback = self.request(self.citizen, "POST", "/ai/chat", {**request, "language": "hi", "message": "प्रगति कैसे देखें?"})
        self.assertEqual((fallback["source"], fallback["language"]), ("curated", "hi"))

        longest = {**generated, "answer": ("The advisor explains the portal. " * 47)[:CHAT_ANSWER_MAX]}
        with patch("app.routes.ai.generate", return_value=longest):
            reply = self.request(self.citizen, "POST", "/ai/chat", request)
        self.assertEqual((reply["source"], len(reply["answer"])), ("ai", CHAT_ANSWER_MAX))
        replayed = {**request, "history": [{"role": "assistant", "content": reply["answer"]}]}
        with patch("app.routes.ai.generate", return_value=generated) as generate:
            self.request(self.citizen, "POST", "/ai/chat", replayed)
        self.assertEqual(generate.call_args.args[0]["history"][0]["content"], reply["answer"])

        routes.CHAT_ATTEMPTS.clear()
        routes.CHAT_ATTEMPTS["stale-user"] = deque([time.monotonic() - 3600])
        with patch("app.routes.ai.generate", return_value=generated):
            for _ in range(12):
                self.request(self.citizen, "POST", "/ai/chat", request)
            self.request(self.citizen, "POST", "/ai/chat", request, 429)
        self.assertNotIn("stale-user", routes.CHAT_ATTEMPTS)  # An idle user is evicted, not kept forever.
        self.assertEqual(len(routes.CHAT_ATTEMPTS), 1)

    def test_ai_failures_and_review_branches(self):
        cid = self.create()
        with patch("app.routes.ai.analyze", side_effect=RuntimeError("no credentials")):
            self.assertEqual(self.request(self.citizen, "POST", f"/challenges/{cid}/analyze", {})["status"], "unavailable")
        with patch("app.routes.ai.analyze", return_value={"domain": "invented"}):
            self.assertEqual(self.request(self.gov, "POST", f"/challenges/{cid}/analyze", {})["status"], "unavailable")
        result = {k: v for k, v in REVIEW.items() if k not in ("decision", "note")}
        result.update(reason_en="Seasonal shortage affects households.", reason_hi="मौसमी कमी से परिवार प्रभावित हैं।", duplicates=[], universities=[{"id": self.ids["university"], "reason_en": "Water expertise", "reason_hi": "जल विशेषज्ञता"}])
        with patch("app.routes.ai.analyze", return_value=result):
            self.assertEqual(self.request(self.gov, "POST", f"/challenges/{cid}/analyze", {})["status"], "ready")
        self.assertIsNone(self.request(self.citizen, "GET", f"/challenges/{cid}")["ai_suggestions"])
        self.assertEqual(self.request(self.gov, "GET", f"/challenges/{cid}")["status"], "submitted")
        self.request(self.public, "GET", f"/public/challenges/{cid}", status=404)
        self.request(self.gov, "POST", f"/challenges/{cid}/review", {**REVIEW, "public_title_en": "x", "public_title_hi": "य", "summary_en": "short", "summary_hi": "छोटा"}, 422)
        self.request(self.gov, "POST", f"/challenges/{cid}/review", {"decision": "needs_information", "note": "Please provide local context."})
        self.request(self.citizen, "PUT", f"/challenges/{cid}", REPORT)
        self.assertEqual(self.request(self.gov, "GET", f"/challenges/{cid}")["revision"], 2)
        self.request(self.gov, "POST", f"/challenges/{cid}/review", REVIEW)
        self.request(self.gov, "POST", f"/challenges/{cid}/assign", {"university_id": self.ids["university"]})
        self.request(self.uni, "POST", f"/challenges/{cid}/assignment", {"decision": "decline", "note": "No capacity this semester."})
        self.assertEqual(self.request(self.gov, "GET", f"/challenges/{cid}")["status"], "validated")
        self.request(self.uni, "GET", f"/challenges/{cid}", status=404)
        duplicate = self.create()
        self.request(self.gov, "POST", f"/challenges/{duplicate}/review", {"decision": "duplicate", "note": "Same community issue.", "duplicate_of_id": duplicate}, 409)
        self.request(self.gov, "POST", f"/challenges/{duplicate}/review", {"decision": "duplicate", "note": "Same community issue.", "duplicate_of_id": cid})
        rejected = self.create()
        self.request(self.gov, "POST", f"/challenges/{rejected}/review", {"decision": "reject", "note": "Outside the scope of this portal."})
        self.request(self.public, "GET", f"/public/challenges/{rejected}", status=404)

    def test_file_validation_limits_and_privacy(self):
        cid = self.create()
        self.request(self.citizen, "POST", "/challenges", {**REPORT, "district": "Outside Jharkhand"}, 422)
        self.request(self.citizen, "POST", "/challenges", {**REPORT, "longitude": None}, 422)
        response = self.citizen.post(f"/api/v1/challenges/{cid}/attachments", files={"file": ("fake.png", b"<script>not a PNG</script>", "image/png")})
        self.assertEqual(response.status_code, 415)
        response = self.citizen.post(f"/api/v1/challenges/{cid}/attachments", files={"file": ("huge.pdf", b"%PDF-1.7\n" + b"x" * (20 * 1024 * 1024), "application/pdf")})
        self.assertEqual(response.status_code, 413)
        self.assertEqual(list(Path(self.files.name).iterdir()), [])
        aid = None
        for i in range(5):
            response = self.citizen.post(f"/api/v1/challenges/{cid}/attachments", files={"file": (f"evidence-{i}.pdf", b"%PDF-1.7\nDemo evidence", "application/pdf")})
            self.assertEqual(response.status_code, 201, response.text)
            aid = response.json()["id"]
        self.request(self.other, "GET", f"/attachments/{aid}", status=404)
        self.request(self.public, "GET", f"/attachments/{aid}", status=401)
        good = self.gov.get(f"/api/v1/attachments/{aid}")
        self.assertEqual(good.status_code, 200)
        self.assertIn("attachment", good.headers["content-disposition"])
        self.assertEqual(good.headers["cache-control"], "no-store")
        response = self.citizen.post(f"/api/v1/challenges/{cid}/attachments", files={"file": ("sixth.pdf", b"%PDF-1.7\nDemo evidence", "application/pdf")})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(len(self.request(self.citizen, "GET", f"/challenges/{cid}/attachments")), 5)


class AIRequestTest(unittest.TestCase):
    def test_json_schema_and_transient_retry(self):
        result = {k: v for k, v in REVIEW.items() if k not in ("decision", "note")}
        result.update(reason_en="Seasonal water shortage.", reason_hi="मौसमी जल संकट।", duplicates=[], universities=[])
        requests = []

        def provider(request):
            requests.append(request)
            config = json.loads(request.content)["generationConfig"]
            # Gemini's protobuf responseSchema rejects additionalProperties;
            # the JSON Schema field supports our strict Pydantic models.
            self.assertNotIn("responseSchema", config)
            self.assertFalse(config["responseJsonSchema"]["additionalProperties"])
            if len(requests) == 1:
                return httpx.Response(503, json={"error": {"code": 503, "message": "temporary", "status": "UNAVAILABLE"}})
            return httpx.Response(200, json={"candidates": [{"content": {"role": "model", "parts": [{"text": json.dumps(result)}]}, "finishReason": "STOP"}]})

        client = genai.Client(api_key="test-only", http_options=types.HttpOptions(client_args={"transport": httpx.MockTransport(provider)}, retry_options=ai.RETRIES))
        with patch("app.ai._client", return_value=(client, "test")):
            self.assertEqual(ai.analyze({"challenge": REPORT, "candidates": [], "universities": []}), result)
        self.assertEqual(len(requests), 2)

    def test_adc_is_preferred_and_api_key_remains_a_fallback(self):
        with tempfile.NamedTemporaryFile() as credentials_file:
            credentials = SimpleNamespace(quota_project_id="test-project")
            vertex_client = object()
            with patch.dict(os.environ, {"GOOGLE_APPLICATION_CREDENTIALS": credentials_file.name, "GEMINI_API_KEY": "fallback"}, clear=True), patch("app.ai.load_credentials_from_file", return_value=(credentials, None)), patch("app.ai.genai.Client", return_value=vertex_client) as constructor:
                self.assertEqual(ai._client(), (vertex_client, "vertex"))
                self.assertTrue(constructor.call_args.kwargs["vertexai"])
                self.assertEqual(constructor.call_args.kwargs["project"], "test-project")
        with patch.dict(os.environ, {"GOOGLE_APPLICATION_CREDENTIALS": "/missing/credentials.json", "GEMINI_API_KEY": "fallback"}, clear=True), patch("app.ai.genai.Client", return_value="key-client") as constructor:
            self.assertEqual(ai._client(), ("key-client", "gemini_api"))
            self.assertEqual(constructor.call_args.kwargs["api_key"], "fallback")
        with patch.dict(os.environ, {"GOOGLE_APPLICATION_CREDENTIALS": "/missing/credentials.json"}, clear=True), patch("app.ai.load_default_credentials", return_value=(SimpleNamespace(), "ambient-project")), patch("app.ai.genai.Client", return_value="ambient-client") as constructor:
            self.assertEqual(ai._client(), ("ambient-client", "vertex"))
            self.assertTrue(constructor.call_args.kwargs["vertexai"])
            self.assertEqual(constructor.call_args.kwargs["project"], "ambient-project")
        with patch.dict(os.environ, {"GOOGLE_APPLICATION_CREDENTIALS": "/missing/credentials.json", "GEMINI_API_KEY": "fallback"}, clear=True), patch("app.ai.load_default_credentials", side_effect=RuntimeError("missing")), patch("app.ai.genai.Client", return_value="key-client") as constructor:
            self.assertEqual(ai._client(), ("key-client", "gemini_api"))
            self.assertEqual(constructor.call_args.kwargs["api_key"], "fallback")
        self.assertEqual(ai.RETRIES.attempts, 3)
        self.assertEqual(ai.RETRIES.http_status_codes, [429, 500, 502, 503, 504])


if __name__ == "__main__":
    unittest.main()
