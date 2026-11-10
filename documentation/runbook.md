# Runbook

How to operate the site. Written from the workflows and Terraform as they are on 2026-11-09. Each procedure has a **Tried** line: Phase 10 is only done when every one has been run once. Update the line (with the date) when you do.

Accounts and names used below: AWS account `769814228024` (profile `sorted`, region `eu-central-1`), site bucket `vdd-site-769814228024`, Worker `vdd-worker`, Lambda `vdd-contact`, IAM user `vdd-worker`, SNS topic `vdd-alerts`. The AWS account is shared with sorted.onl: never touch `sorted-*` resources.

## Deploy

Every merge to `main` in the app repo deploys (`.github/workflows/deploy.yml`). Nothing is deployed from a laptop.

Order inside the job, and why:

1. Build the site (this also builds both CV PDFs with Typst).
2. Update the contact Lambda, so the Worker never calls an older contract.
3. Upload `/_astro/` hashed assets **without** `--delete`: cached HTML from the previous deploy still points at the old ones.
4. Upload everything else with `--delete`.
5. `wrangler deploy` for the Worker.
6. Purge the whole Cloudflare cache.
7. Smoke test against the live site: six security headers and an enforced CSP, a custom 404, 405 on `POST /` and `GET /api/contact`, `/api/contact` rejected for another origin, a missing token and a made-up token (nothing is sent), the Lambda refusing unsigned calls, `robots.txt`, sitemap and share image served, `www` and `http` redirects, and the bucket refusing direct access.
8. Prune old hashed assets (`.github/scripts/prune-assets.sh`): deletes `_astro/` files that are not in this build and were last uploaded more than 30 days ago. A failure only logs a warning. Try it without deleting: `DRY_RUN=1 .github/scripts/prune-assets.sh vdd-site-769814228024 site/dist/_astro 30` (needs a build and AWS credentials). The bucket is versioned, so a wrong delete can be restored for 30 days.

A failed smoke test means the deploy is live but wrong: roll back (below) first, then investigate.

Redeploy without a code change: Actions → Deploy → Run workflow.

Infrastructure is separate: the infra repo's `Apply` workflow runs on pushes to `main` that touch `main/**`, behind the `production` environment (a person approves). It refuses a plan that deletes or replaces anything unless re-run with `allow_destroy`.

**Tried:** deploys run on every merge (many times). Redeploy by hand: run on 2026-11-09 (Actions → Run workflow on `main`): green in 56 seconds, smoke test passed, and it put the Worker on a new version after the rollback test. Pruning: the script is tested against a stubbed `aws`; nothing is old enough to delete before 2026-12-03 (the oldest asset is from 2026-11-04).

## Roll back

Pick the smallest thing that fixes it.

**A bad site change (most cases).** Revert the commit through a PR (`main` is protected, no direct pushes): `git revert <sha>` on a branch from `main`, open the PR, merge. The pipeline redeploys the old content. Takes about the time of one CI run plus one deploy.

**A bad Worker (headers, routing, contact).** Faster than a PR, from `worker/`:

```bash
pnpm exec wrangler deployments list
pnpm exec wrangler rollback            # previous version; or pass a version id
```

Needs `CLOUDFLARE_API_TOKEN` with Worker edit rights. Afterwards, revert the commit as above, or the next deploy puts the bad version back.

**Bad or deleted files in the bucket.** The bucket is versioned; noncurrent versions are kept for 30 days. List versions of an object with `aws s3api list-object-versions --bucket vdd-site-769814228024 --prefix <key>` and restore one by copying it over the current key (`aws s3api copy-object` with `--copy-source …?versionId=…`). A normal revert is simpler; use this when a deploy removed something it should not have.

**A bad Lambda.** Revert the commit; the deploy rebuilds and uploads the previous code. For an emergency, `aws lambda update-function-code` with a previous zip works too, but nothing keeps old zips, so a revert is the way.

**A bad infrastructure change.** Revert the commit in the infra repo; `Apply` runs again. If a resource was destroyed, review the plan and re-run with `allow_destroy` only after reading it.

After any rollback, purge the Cloudflare cache if the deploy job did not (Cloudflare → Caching → Purge Everything), then run the smoke test:

```bash
SITE_BUCKET=vdd-site-769814228024 node --test "tests/smoke/*.test.mjs"
```

**Tried:** the Worker rollback on 2026-11-09: `wrangler rollback` restored the previous version (the deployment list shows a "Rollback" entry) and the site kept answering with HSTS and the CSP; a manual redeploy then moved the Worker forward again. The revert PR on 2026-11-10: a marker comment was merged (#113) and reverted through a PR (#114); both deploys were green, the marker is gone from `main` and the smoke test passed (14 of 14). The other cases (bucket versions, Lambda, infra) are not tried.

## Rotate the Worker's AWS key

The `vdd-worker` IAM user's key lives only in Worker secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`). Last rotated 2026-11-09; **rotate by 2027-02-07** (the workflow does it from 2027-01-28). IAM allows two keys per user, so there is no downtime.

**Automatic:** `.github/workflows/rotate-key.yml` runs every Monday and rotates when the key is 80 days old or more (first automatic rotation about 2027-01-28). It assumes the `vdd-key-rotation` role through OIDC (repo variable `AWS_ROTATION_ROLE_ARN`), creates the second key, checks that it can read the site bucket, sets both Worker secrets in one `wrangler secret bulk` call, runs the smoke test, then deletes the old key. If it fails before the Worker secrets change it deletes the new key; after that it leaves both keys and opens a GitHub issue. Run it by hand from Actions → Rotate Worker key (tick "force" to rotate regardless of age). With exactly two keys on the user the workflow refuses to run: find out which one the Worker uses, delete the other, re-run.

**By hand** (fallback, or if the workflow is broken):

1. Create the second key (the account is shared, so use the `sorted` profile after `aws login --profile sorted`):
   ```bash
   aws iam create-access-key --user-name vdd-worker --profile sorted
   ```
   Copy the two values. They are shown once.
2. Set both Worker secrets **in a real terminal**, never through Claude Code's `!`: `wrangler secret put` without keyboard input stores an empty value and still reports success.
   ```bash
   cd worker
   pnpm exec wrangler secret put AWS_ACCESS_KEY_ID
   pnpm exec wrangler secret put AWS_SECRET_ACCESS_KEY
   ```
3. Check the site: load `/` and a case study, then run the smoke test (above). A wrong key shows as 404s, because the Worker maps S3 403 to the 404 page; the smoke test's 200 on `/` catches it.
4. Delete the old key:
   ```bash
   aws iam list-access-keys --user-name vdd-worker --profile sorted
   aws iam delete-access-key --user-name vdd-worker --access-key-id <OLD_ID> --profile sorted
   ```
5. Update the key date in [next-steps.md](next-steps.md) ("Key rotation") and CLAUDE.md.

Other secrets and their sources:

- `TURNSTILE_SECRET_KEY` (Worker secret): from the Cloudflare Turnstile widget. Same rule: set it in a real terminal. The smoke test fails with a 503 if it is empty.
- Cloudflare API tokens (two, separate): the **infra** token `infra-terraform-vedad-dizdarevic-dev` (infra repo Actions secret and Dependabot secret, expires **2027-11-02**) and the **app** token (app repo Actions secret, Worker edit, zone routes, cache purge). Cloudflare shows a token's value once; rolling it invalidates the old value at once, so set every copy straight afterwards (`gh secret set CLOUDFLARE_API_TOKEN --repo …`, and with `--app dependabot` for the infra repo), then re-run a `Plan`. Rolled on 2026-11-09 after a plan failed for Dependabot PRs (Dependabot reads its own secret store).

**Tried:** the workflow, forced, on 2026-11-09: passed (one key left, created that day). The manual steps: not yet.

## Update the CV

1. Edit `cv/data.yaml` (EN and DE sections). Never add a phone number, street address, date of birth or private email: `cv/check.sh` fails the build on those.
2. Build and check locally (needs `typst`, and `poppler-utils` for the check):
   ```bash
   cv/build.sh && cv/check.sh
   ```
   The PDFs land in `site/public/cv/` and are git-ignored; the site build makes them again in CI.
3. Open a PR. The `site` job builds the CV and runs the check. Merge; the deploy publishes the new PDFs.

The Typst version is pinned in `.github/actions/setup-typst`. `cv/reference/` holds the owner's originals and is never committed.

**Tried:** the CV was built and published through this path (2026-11-08).

## Add a case study

1. Write `site/src/content/case-studies/en/<slug>.mdx` and the German `de/<slug>.mdx` (schema in `site/src/content.config.ts`; the folder is the language). Facts come from the owner's notes in `case-studies/` only. DevOps first: platform before application, infrastructure figures as outcomes, honest Limitations section.
2. Images go through the Astro image pipeline (`ThemedScreenshot`, `ScreenshotGallery`), never into `public/`. Every image needs real alt text; every diagram needs a text alternative in both languages.
3. `draft: true` keeps it out of production builds; `SHOW_DRAFTS=1` (and `dev`) shows it.
4. Run `pnpm --filter @vdd/site dev` to look at it; `pnpm --filter @vdd/e2e test` runs the checks. The sweep test finds the new page by itself and checks overflow, images, console errors and axe.
5. The case study order and the "Next case study" loop follow `order` in the frontmatter. Add an entry to the Work with me grid only where the page really shows that service (`hireServices` in the i18n files).

**Tried:** done three times (Sorted, Rain Alert, this site).

## Alerts

All alarms publish to the SNS topic `vdd-alerts`, which emails the address in the `ALERT_EMAIL` variable (the subscription is confirmed). Each alarm also sends an email when it returns to OK.

| Alarm | Fires when | First things to check |
|---|---|---|
| `vdd-contact-lambda-errors` | The contact Lambda returned an error in 5 minutes | CloudWatch log group `/aws/lambda/vdd-contact` (30-day retention; the function never logs names, addresses or messages). Is SES healthy? Did the last deploy change the Lambda? Roll back. |
| `vdd-contact-lambda-throttles` | The Lambda was throttled (account-wide concurrency limit; per-function concurrency cannot be reserved on this account) | Is another workload on the shared account using the concurrency? |
| `vdd-contact-lambda-invocations` | More than 30 invocations in an hour (real use is a few a day) | Abuse or a loop. Check the Worker logs in Cloudflare and Turnstile analytics. As an emergency brake, remove the `/api/contact` route by rolling the Worker back, or disable the function URL. |
| `vdd-ses-bounce-rate` | Account bounce rate above 5% (AWS pauses sending at 10%) | SES console, reputation dashboard. Often a typo in the contact address or a mail-from DNS problem. |
| `vdd-ses-complaint-rate` | Account complaint rate above 0.1% (AWS pauses at 0.5%) | Same console. The account is shared with sorted.onl, so the cause may be there. |
| Budget `vdd-monthly` ($5, filtered to the `Project` tag) | Actual or forecast spend above 100% | Cost Explorer, grouped by service. Expected cost is a few cents; a spike points at the Lambda or S3 requests. |

Uptime and keyword checks are in Better Stack (an account setting, not in the repos): the apex monitor exists; `/de/` and a keyword check are still to add.

### Test an alarm

Putting an alarm into the ALARM state by hand exercises the whole path (alarm, SNS, email) without causing a real fault:

```bash
aws cloudwatch set-alarm-state --profile sorted --region eu-central-1 \
  --alarm-name vdd-contact-lambda-errors --state-value ALARM --state-reason "alert test"
```

Repeat for each alarm name in the table. CloudWatch puts it back to OK at the next evaluation, which sends a second email. Check that both arrive.

**Tried:** all five alarms put into ALARM by hand on 2026-11-09; every one emailed and returned to OK with a second email.

## Where things live

| What | Where |
|---|---|
| Site, Worker, Lambda, tests, CV | This repo |
| Terraform (bootstrap, main) | The `infra` repo |
| Terraform state | S3 bucket `vdd-tfstate-769814228024` |
| Worker secrets | Cloudflare (`wrangler secret put`), never in a repo |
| Branch protection | GitHub settings, both repos (PR required, linear history, required checks) |
| Weekly external link check | `.github/workflows/links.yml` (opens an issue when links break) |
| Dependency updates | Dependabot, weekly, both repos |
