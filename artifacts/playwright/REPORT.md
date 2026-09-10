# Playwright audit report

Date: 10 September 2026

The isolated citizen → government → university → industry → milestone → outcome lifecycle completed successfully against PostgreSQL and live Vertex AI. The temporary database schema and local audit processes were removed afterward.

## Defects reproduced and fixed

- The root ADC file was neither ignored nor selected. It is now ignored, loaded first for Vertex AI with the quota project and global location, and protected by API-key fallback.
- Gemini transient failures could end the flow. Requests now retry only `429/500/502/503/504`, up to three attempts with bounded exponential backoff. A real `504 → 200` recovery occurred during the audit.
- Next.js rewrites reset AI requests after 30 seconds even when the backend recovered. The proxy timeout is now 120 seconds, covering the bounded retry window.
- Government reviewers could publish placeholder copy. Both public titles now require 8 characters and both summaries require 30 characters in browser and API validation.
- Government AI output required a separate, easy-to-miss drafting step. One explicit bilingual action now fills domain, priority, and all four public-copy fields while keeping them editable.
- The skip link changed the URL without moving keyboard focus. It now focuses the main region. The mobile navigation also announces its current open/close state.
- The malformed public demo record was replaced with the approved bilingual title and summary.

## AI assistance verified

- Citizen same-language clarity draft and missing-information questions.
- Government classification, priority, safe bilingual public copy, duplicates, and university ranking.
- University editable approach, duration, and milestone suggestions without budget or evidence generation.
- Industry ranked opportunity matches with constrained support kinds and bilingual reasons.
- Government outcome recommendation, bilingual rationale, evidence gaps, and metric observations stored separately from the decision.

All actions remained human-triggered except post-submission challenge analysis. No assistant directly submitted, published, assigned, approved, rejected, or resolved a record.

## Access, failure, and UI results

- Invalid evidence returned `415`; the challenge remained saved and accepted a later valid PDF upload.
- Public challenge JSON exposed only reviewed public fields and approved aggregate outcomes. It contained no report text, locality, identity, coordinates, evidence, discussion, or AI suggestions.
- Another university received the protected-record response, citizen analytics access was denied, logged-out deep links redirected to sign-in, and a duplicate outcome approval returned `409 invalid_transition`.
- Desktop and 390 px layouts had no horizontal overflow. English and Hindi pages, mobile navigation, skip-link focus, empty/loading/error states encountered in the flow, notifications, discussion, feedback, and analytics were exercised.
- Playwright recorded zero browser console errors or warnings after the fixes.

## Validation

- Backend: 6 integration tests passed, including an actual mocked `503 → 200` SDK retry.
- Alembic: no model/migration drift.
- Python compile check: passed.
- Dependency lock: current (44 packages).
- Frontend TypeScript: passed.
- Next.js production build: passed with all 14 routes generated.
- Live ADC smoke test: structured classification, bilingual output, and reference validation passed.

## Screenshots

- [Hindi mobile public experience](public-hindi-mobile.png)
- [Government analytics](government-analytics.png)
- [Resolved lifecycle detail in Hindi](resolved-lifecycle-hindi.png)
- [Industry AI opportunity matches](industry-ai-matches.png)
- [Citizen AI drafting](audit-citizen-ai-draft.png)
- [Government Hindi review](audit-government-hindi-review.png)
- [Government outcome analysis](audit-government-outcome-ai.png)
- [Industry AI matching detail](audit-industry-ai-matches.png)
- [Public Hindi mobile audit](audit-public-hindi-mobile.png)
- [University AI planning](audit-university-ai-plan.png)
