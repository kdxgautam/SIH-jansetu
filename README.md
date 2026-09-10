# JanSetu · Jharkhand Innovation Portal

A working English/Hindi societal innovation MVP using Next.js, FastAPI, custom session authentication, and PostgreSQL. Citizens submit challenges; government reviewers validate and allocate them; universities manage teams and delivery; industry partners offer support. Public pages expose reviewed summaries and approved impact totals.

All seeded institutions, people, project records, and outcomes are demonstration data. This is not an official government service.

## Run locally

Requirements: Node.js 22+, Python 3.12, [uv](https://docs.astral.sh/uv/), and Docker with Compose.

From the project root:

```sh
docker compose up -d --wait db
```

Set up and start the API in one terminal:

```sh
cd backend
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run python -m app.seed
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start the frontend in a second terminal:

```sh
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Open **http://localhost:3000**. Use that hostname consistently: `APP_ORIGIN` must exactly match the browser origin for state-changing requests. PostgreSQL is bound to `127.0.0.1:54329`; its data lives in the Compose named volume. Stop it with `docker compose stop db` to retain records.

The API is at `http://127.0.0.1:8000/api/v1`; interactive endpoint documentation is at `http://127.0.0.1:8000/docs`. The frontend proxies `/api/*` to FastAPI. Health checks are available at `/api/v1/health` on either server.

## Demo accounts

Default password for all seeded accounts: **`DemoPass123!`**. The login screen's role buttons fill these credentials; they do not bypass authentication. `DEMO_PASSWORD` can override the password before the first seed; then enter the replacement password manually.

| Role | Email | Organization |
|---|---|---|
| Citizen | `citizen@demo.local` | Community submitter |
| Government | `government@demo.local` | State Innovation Cell |
| University | `university@demo.local` | Demo · Ranchi Institute of Technology |
| Industry | `industry@demo.local` | Demo · GreenGrid Industries |
| University | `university2@demo.local` | Demo · Birsa Rural Innovation Centre |
| University | `university3@demo.local` | Demo · Santhal Community University |
| Industry | `industry2@demo.local` | Demo · Adiva Social Ventures |

The seed command is explicit and idempotent. It never resets existing records or runs automatically at startup. Citizens can also register with an email, name, and password of at least ten characters. Institution and government registration, email verification, and password recovery are outside this local MVP.

## Walk through the lifecycle

1. **Citizen:** create a challenge with a title, description, submitter type, district, and locality. GPS is optional. Add evidence during submission or afterward. The report is saved before uploads and AI analysis; upload failures can be retried without creating another report.
2. **Government:** open the review queue. Inspect the private report and AI suggestions if configured. Approve safe public titles and summaries in both languages, choose a domain and priority, then assign a university. Alternatively request information, reject with an explanation, or link a duplicate to an existing challenge.
3. **University:** accept the assignment to create the project, or decline to return it to the allocation queue. Add a student and a faculty mentor, including their disciplines. Submit an approach, budget, and duration.
4. **Government:** approve the proposal or request revisions. Approval starts the project.
5. **Industry:** browse the public challenge, then offer mentorship, funding, prototyping, a pilot, or technology transfer. Funding records commitments in INR; there is no payment processing or claim that money was received.
6. **University:** accept an industry offer to grant project access, or decline it. Add milestones and submit testing evidence for each. **Government** approves the evidence or requests revisions.
7. **University:** once every milestone is approved, submit beneficiaries, an impact measure with unit and baseline/result, testing evidence, and any patent/startup references. **Government** validates the outcome to resolve the challenge, or requests changes.
8. **Citizen:** add optional community feedback. Use the project discussion throughout the process. Check notifications and government analytics to see recorded events and aggregate outcomes.

The seeded examples cover intake, requests for information, allocation, proposals, active projects, outcome review, and completion. The language switch works on public pages and all workspaces; user-entered reports and organization profiles retain their original language.

## AI configuration

For local Vertex AI access, place Application Default Credentials at `application_default_credentials.json` in the project root and keep the file private (`chmod 600 application_default_credentials.json`). The filename is ignored by Git. The backend uses ADC first, with `GEMINI_API_KEY` from `backend/.env` as a fallback. `GOOGLE_CLOUD_LOCATION` defaults to `global`; `GEMINI_MODEL` defaults to `gemini-3.8-flash`.

The Google GenAI integration uses structured, Pydantic-validated output for classification, priority reasons, English/Hindi publication drafts, duplicate suggestions, and university recommendations. It also provides optional citizen writing guidance, university project-plan drafts, industry opportunity matching, and government outcome-evidence checks. Suggestions are stored separately from approved decisions. Returned IDs must belong to the supplied candidate set. Only government reviewers can read stored challenge and outcome suggestions.

Run a live smoke check with synthetic data:

```sh
cd backend
uv run python -m app.ai_smoke
```

Without valid credentials, or when the provider fails or returns invalid output, the UI clearly offers manual work. Transient provider failures are retried up to three times. No classification, publication, rejection, deduplication, assignment, partnership, project plan, evidence, or validation decision is silently faked. A crashed challenge analysis becomes eligible for retry after two minutes.

The demo analyzes at most 40 recent challenges, prioritizing the same district, 50 university profiles, and 30 active industry opportunities. These are bounded shortlists, not exhaustive semantic search. Add semantic retrieval when directory size or matching recall requires it. The provider receives only the text needed for each explicit task; it never receives uploaded files, login credentials, GPS coordinates, exact localities, names, or discussion messages.

## Access, evidence, and consistency

- Passwords are hashed with Argon2. Random session tokens are stored as SHA-256 hashes, expire after seven days, and are revoked on logout. Cookies are HttpOnly and SameSite=Lax, with Secure enabled for HTTPS origins. Tokens are not stored in browser storage.
- All mutations require the configured Origin. Authentication attempts are persisted and serialized with PostgreSQL advisory locks: 15 attempts per normalized email and 60 per API peer IP in 15 minutes. The local Next.js proxy shares the IP bucket; configure trusted proxy addressing before a public rollout.
- Citizen registration always creates a citizen. Every private challenge, project action, organization edit, notification update, and evidence download checks role and ownership or accepted participation in FastAPI.
- Public response models contain only reviewed titles/summaries, district, domain, stage, lead institution, project reference, and approved aggregate outcomes. Private locations, raw reports, identities, comments, attachments, and unapproved AI drafts are excluded.
- Evidence allows five files per challenge, each up to 20 MB: JPEG, PNG, PDF, and MP4. The server checks extension, declared media type, signature, and size; generates storage names; and serves authorized downloads as attachments. Failed writes are removed. Uploaded files live under `backend/.data/uploads`, outside public assets.
- Lifecycle changes lock the challenge row; changes, activity history, and notifications commit together before the response. Duplicate assignment, proposal, offer, and approval actions are rejected. An industry offer confers project access only after university acceptance.
- Discussions, notification lists, project details, and analytics refresh every 30 seconds while their page is visible. Local React state handles forms; there is no separate realtime server or queue.

## Checks and production build

```sh
cd backend
uv run python -m unittest discover -s tests -v
uv run alembic check
uv run python -m compileall -q app
```

The integration checks create and drop randomly named PostgreSQL schemas using the configured database. They require permission to create schemas, use mocked AI responses, and do not modify demo records. Use the local database for these checks.

```sh
cd frontend
npm run typecheck
npm run build
npm start
```

Stop the development frontend before `npm start`, since both use port 3000. Production builds use Next.js's supported Webpack compiler for compatibility with restricted development environments. The committed lockfiles reproduce the tested dependencies.

Validation covers the full workflow, revision branches, duplicate actions, role escalation, cross-organization access, private/public separation, session expiry and logout, authentication throttling, file type/size/count restrictions, notifications, and invalid or unavailable AI output. Browser verification covers all four roles, public filters and empty states, English/Hindi, and responsive layouts. A real Gemini call requires a configured key; the local demo works without one.

## Move the database to Neon later

1. Create a Neon database and obtain its direct PostgreSQL connection string.
2. Set `DATABASE_URL` in the API environment, using the `postgresql+psycopg://` driver prefix and retaining `sslmode=require`. Keep passwords out of source control.
3. Run `uv run alembic upgrade head` against the new database. This creates the schema; it does not copy existing local data. Transfer data separately with standard PostgreSQL backup/restore tooling if needed.
4. Point the frontend's `BACKEND_URL` at the deployed FastAPI service, set `APP_ORIGIN` to the public HTTPS frontend origin, and rebuild/restart the services.

Neon hosts the database, not the API or evidence files. Preserve the API upload directory on durable storage or add private object storage before deploying to an ephemeral filesystem. Public deployment, messaging delivery, native apps, payment processing, and account recovery are deferred.

## Assets

The local forest hero photograph comes from [Unsplash](https://images.unsplash.com/photo-1448375240586-882707db888b). It illustrates a green landscape and is not presented as a verified photograph of a Jharkhand project. Icons use Phosphor. No external image request is needed to render the portal.
