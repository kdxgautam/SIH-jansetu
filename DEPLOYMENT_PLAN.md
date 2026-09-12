# JanSetu MVP deployment plan

## Decision

Deploy the Next.js frontend to **Vercel**, the FastAPI backend to **Google Cloud Run**, keep PostgreSQL on **Neon**, and mount a private **Google Cloud Storage** bucket at `/data/uploads` for evidence files.

This is the shortest production-shaped path for the current application:

- Vercel runs the existing Next.js application and forwards `/api/v1/*` to Cloud Run through the existing rewrite.
- Cloud Run provides an HTTPS FastAPI service and an identity that can call Vertex AI without shipping a credential file.
- Neon is already migrated and its pooled endpoint is suitable for application traffic.
- A Cloud Storage volume preserves the existing private filesystem upload/download implementation without adding a storage abstraction.

Render remains a fallback for a short-lived demo. It is not the primary choice because its persistent disk limits the API to one instance and disables zero-downtime deployment. It would also require a Gemini API key or a separately managed Google credential.

## Current resource inventory

| Resource | State | Deployment impact |
|---|---|---|
| Neon PostgreSQL | Connected; Alembic `6e0c0f4a1d2b` at head | Ready, including milestone-linked evidence attachments. |
| Database URL | Pooled Neon endpoint with SSL | Use for Cloud Run runtime. Obtain a direct Neon URL for migrations. |
| Vertex credentials | Root ADC file present, type `authorized_user`, mode `0600` | Local development only. Never upload or deploy this file. |
| Gemini API key | Configured locally | Keep as local/fallback secret; do not put it in Vercel. |
| Vercel CLI | `59.9.1`, authenticated | Ready. Create a uniquely named project; do not reuse the unrelated existing `frontend` project. |
| Google Cloud CLI | `583.0.0`, project configured, no active CLI account | Run `gcloud auth login` before provisioning. |
| Render CLI | `2.26.0`, authenticated, no active workspace | Available only as fallback after `render workspace set`. |
| Docker | Engine `29.8.0`; Compose `5.5.1` | Ready for local image verification. |
| Backend runtime | Python `3.12.14`, uv lockfile | Ready after adding a production Dockerfile. |
| Frontend runtime | Node `22.20.0`, npm lockfile | Ready; pin Vercel to Node 22. |
| Source control | Git repository on `origin/main` | CI runs backend migrations/tests and frontend typecheck/build on pushes and pull requests. |
| Local capacity | About 17 GB disk and 4 GB available memory | Enough for one local container build; avoid retaining unused images. |
| Deployment manifests | Backend Dockerfile, Compose, Vercel project configuration | Ready for the documented Cloud Run and Vercel release path. |

## Remaining production hardening

The Dockerfile, dependency lockfiles, ambient ADC fallback, ADC test, Node 22
pin, and CI release checks are present.

Set `TRUSTED_PROXY_HOPS=2` on the Cloud Run revision. Every request arrives from
the Vercel proxy by way of the Cloud Run front end, so without it the whole user
base shares one address and one busy minute returns `429` to everyone. The value
is the number of proxies between the browser and the API that you control, and
the address is read that many entries from the right of `X-Forwarded-For`, which
is why a forged prefix cannot widen a caller's own ceiling. Leave it at `0`
anywhere the API is reached directly.

Evidence storage has two supported shapes. The bucket volume mount below keeps
`UPLOAD_DIR` pointed at a mounted path. Setting `UPLOAD_BUCKET` instead uses the
Cloud Storage client directly, which avoids the FUSE mount's latency and its
partial POSIX semantics; downloads stream through the API either way, so
authorization is unchanged and no object is ever public.

No CORS middleware is required: browser traffic stays on the Vercel origin and uses the existing `/api/v1` rewrite. `APP_ORIGIN` must exactly equal the final Vercel production origin so mutations and secure cookies work.

## Production settings

Use these names as defaults and change them once if a naming collision exists:

```sh
export PROJECT_ID="your-google-cloud-project"
export REGION="us-east4"
export SERVICE="jansetu-api"
export SERVICE_ACCOUNT="jansetu-api"
export REPOSITORY="jansetu"
export BUCKET="your-globally-unique-jansetu-uploads"
export VERCEL_PROJECT="jansetu-jharkhand"
export RELEASE="$(date -u +%Y%m%d-%H%M%S)"
```

`us-east4` is the starting region because the configured Neon database is in AWS `us-east-2`. Measure database latency after deployment and change the region only if another supported region performs better.

Cloud Run service settings:

- 1 vCPU, 1 GiB memory
- concurrency 20
- minimum instances 0 for the demo, 1 when cold starts are unacceptable
- maximum instances 2 to bound database connections and spend
- request timeout 120 seconds for bounded Gemini retries
- `/api/v1/health` as the health endpoint
- public ingress, because Vercel must reach it; application authorization remains enforced by FastAPI

## Phase 1: local release gate

Run tests against the local Docker PostgreSQL instance, not the pooled Neon URL. The integration suite uses isolated schemas and should not create test data in production.

```sh
docker compose up -d --wait db

cd backend
uv sync --frozen
uv run python -m unittest discover -s tests -v
uv run alembic check
uv run python -m compileall -q app
cd ..

cd frontend
npm ci
npm run typecheck
npm run build
cd ..

docker build -t jansetu-api:local backend
docker run --rm -p 8080:8080 --env-file backend/.env -e PORT=8080 jansetu-api:local
```

Confirm `http://localhost:8080/api/v1/health` returns `{"status":"ok","database":"ok"}`. Stop the foreground container after the check.

## Phase 2: provision Google Cloud

Authenticate the CLI and enable only the services this release uses:

```sh
gcloud auth login
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com aiplatform.googleapis.com storage.googleapis.com
```

Create the runtime identity, image repository, and private upload bucket:

```sh
gcloud iam service-accounts create "$SERVICE_ACCOUNT" --display-name="JanSetu API"
gcloud artifacts repositories create "$REPOSITORY" --repository-format=docker --location="$REGION"
gcloud storage buckets create "gs://$BUCKET" --location="$REGION" --uniform-bucket-level-access

gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/aiplatform.user"
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/storage.objectUser"
```

Store two Neon URLs in Secret Manager:

- `jansetu-database-pooled`: pooled URL for API requests.
- `jansetu-database-direct`: direct URL for Alembic migrations and database export/import tasks.

Create secret versions interactively or from temporary files that are deleted immediately. Do not place secret values in shell history, command arguments, build logs, or repository files.

Grant the service identity Secret Accessor on both secrets. The API revision mounts only the pooled secret; the migration job mounts only the direct secret.

## Phase 3: build, migrate, and deploy the API

Build one immutable image and reuse it for migration and serving:

```sh
gcloud builds submit backend --tag "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/api:$RELEASE"
```

Create or update a Cloud Run migration job whose `DATABASE_URL` comes from `jansetu-database-direct`, then run it before shifting API traffic:

```sh
gcloud run jobs deploy jansetu-migrate \
  --image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/api:$RELEASE" \
  --region="$REGION" \
  --service-account="$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --command=uv \
  --args=run,alembic,upgrade,head \
  --set-secrets=DATABASE_URL=jansetu-database-direct:latest

gcloud run jobs execute jansetu-migrate --region="$REGION" --wait
```

Deploy the API with the pooled database secret and private upload volume:

```sh
gcloud run deploy "$SERVICE" \
  --image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/api:$RELEASE" \
  --region="$REGION" \
  --service-account="$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=1Gi \
  --concurrency=20 \
  --min=0 \
  --max=2 \
  --timeout=120 \
  --set-secrets=DATABASE_URL=jansetu-database-pooled:latest \
  --set-env-vars="APP_ORIGIN=https://$VERCEL_PROJECT.vercel.app,TRUSTED_PROXY_HOPS=2,UPLOAD_DIR=/data/uploads,GEMINI_MODEL=gemini-3.8-flash,GOOGLE_CLOUD_LOCATION=global" \
  --add-volume=name=uploads,type=cloud-storage,bucket="$BUCKET" \
  --add-volume-mount=volume=uploads,mount-path=/data/uploads
```

Do not deploy `application_default_credentials.json` or set `GOOGLE_APPLICATION_CREDENTIALS` in Cloud Run. The service identity supplies ambient credentials.

## Phase 4: deploy the frontend

Create a new Vercel project from `frontend/`, set its production `BACKEND_URL` to the Cloud Run service URL, and deploy:

```sh
vercel link --cwd frontend --project "$VERCEL_PROJECT"
vercel env add BACKEND_URL production --cwd frontend
vercel deploy --prod --cwd frontend
```

Verify that the resulting production origin exactly matches `APP_ORIGIN`. If Vercel assigns a different production domain, update Cloud Run first, then repeat the mutation smoke tests. Preview deployments should use their own backend/origin pair; otherwise keep previews read-only because the backend accepts one configured mutation origin.

## Phase 5: optional demo seed

The Neon database is currently empty. For a public demo, create a one-off seed job using the same image, the direct database secret, and a new non-default `DEMO_PASSWORD` secret. Run it once after migrations. Skip this phase for a clean production environment.

Never expose seeded government, university, or industry accounts where real citizen data is accepted. The current seeded identities are explicitly demonstration records.

## Verification checklist

Run these checks through the Vercel URL:

1. `/api/v1/health` reports API and database healthy.
2. Public challenge listing works without authentication and contains no private fields.
3. Registration sets an HttpOnly, Secure, SameSite=Lax session cookie on the Vercel domain.
4. A citizen submits a challenge and uploads/downloads one permitted test file.
5. Government review can invoke Vertex AI and receives a validated suggestion or the documented manual fallback.
6. University and industry role boundaries reject cross-organization access.
7. Logout revokes the database session.
8. Refresh the service or deploy a new revision and confirm the uploaded file remains available from the bucket mount.
9. Check Cloud Run logs for errors without prompts, credentials, original private text, or file contents.
10. Run desktop and 390 px mobile smoke checks in English and Hindi.

After verification, run one complete lifecycle with synthetic data and record the release image tag, migration revision, Vercel deployment URL, Cloud Run revision, and test time in the release notes.

## Rollback

- **Frontend:** use `vercel rollback` to promote the previous working deployment.
- **API:** route Cloud Run traffic back to the previous revision. Keep every image tag immutable.
- **Database:** write backward-compatible migrations. Do not automatically downgrade after a failed release; restore from a Neon branch or backup only when a forward fix cannot recover safely.
- **Uploads:** enable bucket versioning before accepting non-test evidence, then recover deleted or overwritten objects through object versions.

## CI/CD after the first successful release

Direct CLI deployment is enough for the first MVP release. After it is stable:

1. Initialize Git, make a clean first commit, and push to a private GitHub repository.
2. Connect `frontend/` to the Vercel project for automatic preview and production builds.
3. Add Cloud Build or GitHub Actions for backend tests, image build, migration job, deployment without traffic, smoke check, and traffic promotion.
4. Use workload identity federation for CI; do not add service-account JSON keys to repository secrets.

## Reference documentation

- [Vercel build and monorepo root configuration](https://vercel.com/docs/builds/configure-a-build)
- [Cloud Run source and container deployment](https://docs.cloud.google.com/run/docs/deploying-source-code)
- [Cloud Run container runtime contract](https://docs.cloud.google.com/run/docs/container-contract)
- [Cloud Run Secret Manager integration](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- [Cloud Run service identity](https://docs.cloud.google.com/run/docs/configuring/services/service-identity)
- [Cloud Storage volume mounts for Cloud Run](https://docs.cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts)
- [Neon connection pooling and direct migration guidance](https://neon.com/docs/connect/connection-pooling)
