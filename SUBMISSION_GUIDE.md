# JanSetu SIH 2026 Submission Guide

Use this checklist before sharing the repository or submitting files to the SIH
portal. It follows the
[NSUT SIH repository template](https://github.com/NSUT-SIH-26/NSUT-SIH-DEMO)
while keeping JanSetu's existing frontend/backend application structure.

## Project identification

| Field | Value |
|---|---|
| Project | JanSetu — Jharkhand Societal Innovation Portal |
| Problem Statement ID | 26043 |
| Problem Statement | A digital platform to crowdsource societal challenges and facilitate collaborative problem solving through universities and industry partnerships |
| Organization | Government of Jharkhand |
| Department | Department of Higher & Technical Education |
| Category | Software |
| Theme | Smart Education |
| Team | BilluSena |
| Team ID | `<REGISTERED_TEAM_ID>` — replace before final submission |

## Reviewer links

- [Live portal](https://jansetu-jharkhand.vercel.app)
- [API health](https://jansetu-jharkhand.vercel.app/api/v1/health)
- [System architecture](docs/architecture.md)
- [Presentation files](submission/PRESENTATION.md)
- [Demo video and walkthrough](submission/DEMO.md)
- [Project screenshots](assets/screenshots/README.md)
- [Browser audit evidence](artifacts/playwright/REPORT.md)
- [Local setup and demo accounts](README.md#run-locally)

## Required repository content

- [x] Actual Next.js and FastAPI source code is present.
- [x] The README explains the problem, solution, features, technology, setup, and output.
- [x] Problem Statement 26043 and the official organization, department, category, and theme are listed.
- [x] Team members and roles are listed.
- [x] Architecture and end-to-end workflow diagrams are documented.
- [x] Dependency lockfiles, database migrations, seed command, and environment examples are present.
- [x] Reviewer screenshots cover the government, university, industry, outcome, and analytics workflow.
- [x] The editable PPTX and portal-ready PDF are stored in `submission/`.
- [x] The demo video link and suggested walkthrough are documented.
- [x] The deployed portal and health endpoint are public.
- [ ] Replace `<REGISTERED_TEAM_ID>` in the README, presentation, and this guide.

## Repository structure

```text
SIH-2/
├── README.md
├── SUBMISSION_GUIDE.md
├── docs/
│   └── architecture.md
├── frontend/
├── backend/
├── assets/
│   └── screenshots/
├── artifacts/
│   ├── playwright/
│   └── ppt/
├── submission/
│   ├── BilluSena_SIH2026_Presentation.pdf
│   ├── BilluSena_SIH2026_Presentation.pptx
│   ├── PRESENTATION.md
│   └── DEMO.md
├── compose.yaml
└── .github/workflows/ci.yml
```

The SIH template permits source code in normal project folders, so `frontend/`
and `backend/` remain at the root. This keeps local commands, CI, Vercel, and Cloud
Run paths stable.

## Public repository safety

- Confirm `application_default_credentials.json`, `.env`, `.env.local`, `.vercel/`,
  build output, uploads, and local Playwright working files are ignored and untracked.
- Publish only demonstration accounts. Never commit production passwords, API keys,
  access tokens, database URLs, private evidence, or real participant information.
- Label screenshots, people, institutions, outcomes, and metrics as demonstration data.
- Open every repository, presentation, video, and demo link in an incognito window.
- Confirm the live public API exposes no report text, identity, exact locality, GPS,
  attachment, discussion, or unapproved AI output.

## Final handoff

1. Replace the Team ID placeholder everywhere.
2. Confirm the PPTX and PDF are the intended final versions.
3. Check that the Google Drive demo video opens without requesting access.
4. Run the backend checks and frontend production build from the README.
5. Verify the live portal in English and Hindi on desktop and mobile.
6. Submit the public GitHub repository link, presentation PDF, and demo video link.

