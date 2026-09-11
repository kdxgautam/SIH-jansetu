# JanSetu System Architecture

JanSetu connects community challenges with government review, university delivery,
industry support, and validated public outcomes. The current deployment is a
responsive English/Hindi web application.

## Challenge lifecycle

```mermaid
flowchart LR
    A[Community identifies a challenge] --> B[Citizen submits report and evidence]
    B --> C{Government review}
    C -->|Request information| B
    C -->|Reject or mark duplicate| X[Close review branch]
    C -->|Validate public summary| D[Assign lead university]
    D --> E{University decision}
    E -->|Decline| D
    E -->|Accept| F[Team and proposal]
    F --> G{Government approval}
    G -->|Request revision| F
    G -->|Approve| H[Project delivery]
    I[Industry offers support] --> J{University accepts offer}
    J -->|Accept| H
    H --> K[Milestones and evidence]
    K --> L{Government milestone review}
    L -->|Request revision| K
    L -->|Approve all| M[University reports outcome]
    M --> N{Government outcome validation}
    N -->|Request changes| M
    N -->|Validate| O[Resolved challenge]
    O --> P[Approved public results and analytics]
```

Every state-changing decision is made by an authorised person. Gemini can draft,
classify, rank, and identify evidence gaps, but it cannot publish, assign, approve,
reject, or validate a record.

## Deployed system

```mermaid
flowchart TB
    U[Browser: public and four role workspaces]
    V[Vercel: Next.js App Router]
    API[Google Cloud Run: FastAPI API]
    DB[(Neon PostgreSQL)]
    FILES[(Private Google Cloud Storage mount)]
    AI[Vertex AI: Gemini structured output]

    U -->|HTTPS| V
    V -->|/api/v1 rewrite| API
    API -->|SQLAlchemy and psycopg| DB
    API -->|Authorised evidence access| FILES
    API -->|Minimum task text only| AI
    AI -->|Validated advisory draft| API
```

The browser uses only the `/api/v1` boundary. Next.js forwards those requests to
FastAPI, where authentication, access control, lifecycle rules, database writes,
file authorization, and AI response validation are enforced.

## AI advisory flow

```mermaid
flowchart LR
    A[Role-authorised request] --> B[Select minimum permitted context]
    B --> C[Gemini structured response]
    C --> D{Schema and reference validation}
    D -->|Invalid or unavailable| E[Manual or curated fallback]
    D -->|Valid| F[Editable suggestion]
    F --> G[Authorised human decision]
```

Challenge analysis may store suggestions separately from approved decisions.
Other assistants return editable drafts. Gemini never receives credentials,
uploaded evidence, GPS coordinates, exact localities, identities, or discussion
messages.

## Trust and data boundaries

| Boundary | Enforcement |
|---|---|
| Authentication | Argon2 password hashes and random database-backed sessions in HttpOnly, SameSite=Lax cookies |
| Mutations | Configured Origin check plus role and record-ownership authorization in FastAPI |
| Private reports | Original descriptions, exact locality, GPS, evidence, identities, and discussions remain participant-only |
| Public records | Separate response models expose approved bilingual summaries, district, domain, progress, lead institution, and validated aggregates |
| Evidence | Type, signature, size, and count validation; generated private storage names; authorised downloads only |
| Lifecycle | Row locking keeps state transitions, activity history, and notifications transactional |

## Source layout

- `frontend/` — Next.js, TypeScript, React, and Tailwind CSS.
- `backend/` — FastAPI, SQLAlchemy, Alembic, PostgreSQL, authentication, and AI integration.
- `compose.yaml` — local PostgreSQL service.
- `assets/screenshots/` — reviewer-facing workflow captures.
- `artifacts/` — supporting browser-audit and presentation-generation evidence.
- `submission/` — final PPTX/PDF and demo links.

