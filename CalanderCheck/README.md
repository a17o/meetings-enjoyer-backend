# Calendar Check Cloud Job

This folder contains everything needed to containerize `CalendarCheck.py` and run it as a scheduled Cloud Run job.

## Prerequisites
- `gcloud` CLI authenticated against the target project
- Artifact Registry (or Container Registry) repository to push images
- `ARCADE_API_KEY` secret available as an env var or Secret Manager entry

## Build & Test Locally
```bash
cd CalanderCheck
docker build -t calendar-check:local .
docker run --rm calendar-check:local
```

## Push Image for Cloud Run Job
```bash
PROJECT_ID=community-mafia
REGION=europe-west2  # or preferred region
IMAGE=europe-docker.pkg.dev/thermal-origin-236720/default/calendar-check:latest

cd CalanderCheck
docker build -t ${IMAGE} .
docker push ${IMAGE}
```

## Deploy Cloud Run Job
1. Update `cloud-run-job.yaml`:
   - Replace `PROJECT_ID` in the image reference.
   - Point `ARCADE_API_KEY` to a Secret Manager reference if possible, e.g.  
     `valueFrom: {secretKeyRef: {name: arcade-api-key, key: latest}}`.
2. Deploy the job:
   ```bash
   gcloud run jobs replace cloud-run-job.yaml --region ${REGION}
   ```
3. Execute on demand:
   ```bash
   gcloud run jobs execute calendar-check --region ${REGION}
   ```
4. (Optional) Schedule via Cloud Scheduler:
   ```bash
   gcloud scheduler jobs create http calendar-check \
     --schedule="*/15 * * * *" \
     --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/calendar-check:run" \
     --http-method=POST \
     --oauth-service-account-email=your-scheduler-sa@${PROJECT_ID}.iam.gserviceaccount.com
   ```

## Environment Variables
- `ARCADE_API_KEY` – required for Arcade API authentication.
- Optionally override `USER_ID` via env var (add logic in `CalendarCheck.py` if needed).


## QUICK
  gcloud run jobs replace cloud-run-job.yaml --region europe-west1
  gcloud run jobs execute calendar-check-large --region europe-west1
