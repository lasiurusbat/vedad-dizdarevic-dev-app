# Next steps

Working log for picking up where the last session stopped. Task-level detail stays in [implementation-plan.md](implementation-plan.md), the schedule in [roadmap.md](roadmap.md). Overwrite this file at the end of each session.

## Stopped at: 2026-11-03 (day 2)

**Done today (app side of Phase 2, in small PRs):**

- **#4 Worker v1** (`worker/`): SigV4 fetch to the private bucket with `aws4fetch` (one retry), clean-URL mapping, `/foo` to `/foo/` 301 only when the page exists, `404.html`, 502 on S3 errors, GET/HEAD only, Cache API rules, six security headers with the CSP in report-only mode. 37 tests in the Workers runtime.
- **#5 Astro placeholder** (`site/`): Astro 7, Tailwind v4 with semantic tokens, `/` and `404.html`, no inline styles or scripts in the output. Prettier now handles `.astro` and sorts Tailwind classes.
- **#6 App CI** (open when this was written): `site` and `worker` jobs next to `lint` and `secrets`.
- The app-repo Cloudflare token is set as `CLOUDFLARE_API_TOKEN`.
- Node upgraded to 22.23.4 through fnm (Astro 7 needs >= 22.23.4).

Nothing is deployed yet: the live URL still has no Worker.

**Merge first**

- app #6 (CI jobs), then the docs PR with this file.
- After #6's first green run, add `site` and `worker` to the required checks (Settings, Branches, `main`). Today only `lint` and `secrets` are required.

## Next: finish Phase 2 (deploy)

1. **Owner:** create the access key for IAM user `vdd-worker` and set it from `worker/` with `wrangler secret put AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. Never paste it in chat. If the first deploy fails with a 403 on an account lookup, add Account Settings Read to the app Cloudflare token.
2. **`tests/smoke`:** `200` on `/`, `404` on a random path, `301` from `www` and from `http`, all six headers, and the bucket returning `403` on direct access. Because the Worker maps S3 403 to the 404 page, also check one request that proves the Worker can really read the bucket (`200` on `/`), so a broken key shows up.
3. **Deploy workflow on `main`** (`gh-app-deploy` through OIDC): build, upload `/_astro/` first without `--delete`, then everything else with `--delete` excluding `/_astro/`, `wrangler deploy`, cache purge, smoke test. Concurrency: one deploy at a time.
4. **Infra pipeline gaps:** apply workflow (`production` environment, `gh-infra-apply`, concurrency without cancelling a running apply), Trivy and Checkov on PRs, plan as a PR comment.

**Phase 2 is done when** a commit to `main` changes the live placeholder within minutes, the smoke test passes, and the bucket returns 403 on direct access.

## Small loose ends

- Better Stack will alert until the first deploy; that is expected.
- The Cloudflare Web Analytics site created by an early apply still exists (`auto_install`) but is not in Terraform state. Check whether it injects a beacon, and decide in Phase 10.
- Phase 0 content inputs are still open: case study notes, screenshots, Impressum details (needed by about D10; Impressum by D20).
- `de.ts` does not exist yet; the placeholder strings are in `site/src/i18n/en.ts`.
- The CSP is report-only and has no report endpoint; check the browser console on every page before enforcing.

## How to run things locally (reminder)

- Node: fnm (`.nvmrc` is `22`). If `node -v` is below 22.23.4, run `source ~/.bashrc`.
- AWS: `aws login --profile sorted` (the session expires; `AWS_PROFILE=sorted` for Terraform).
- Terraform in `infra/main`: needs `terraform.tfvars` (git-ignored) and `CLOUDFLARE_API_TOKEN` exported. Use `terraform plan -out=tfplan` then `terraform apply tfplan`, from `infra/main`.
- The owner runs commands that touch secrets or the live account, and force-pushes after a rebase. The assistant prepares the exact commands and reviews the output.
- Site: `pnpm --filter @vdd/site dev` serves http://localhost:4321/. Worker: `pnpm --filter @vdd/worker test`.
- `documentation/`, `case-studies/` and `CLAUDE.md` are excluded from Prettier.

## Decisions and gotchas worth remembering

- OIDC subjects are immutable (`repo:<owner>@<ownerId>/<repo>@<repoId>`); trust policies pin numeric IDs. A repo rename or recreate means updating `infra/bootstrap` variables.
- AWS account `769814228024` is shared with sorted.onl. Everything here is prefixed `vdd-`.
- Lambda concurrency is not reserved (AWS rejects it on this account).
- Cloudflare returns TXT content quoted; TXT `content` in Terraform uses escaped quotes.
- A variable missing in CI (for example `purelymail_ownership_proof`) causes a spurious plan diff, and could cause a destructive apply.
- The Terraform token cannot manage Cloudflare Web Analytics (403). Not in Terraform for now.
- Worker tests: the edge cache persists across tests within a file, so each test uses its own host. `@cloudflare/vitest-plugin` replaced the deprecated `vitest-pool-workers`; `SELF` is gone.
- URL parsing collapses `%2e%2e` before the Worker sees it; the Worker itself rejects `..%2f` style paths.
- Two PRs that both change `pnpm-lock.yaml` conflict; rebase, take the other lockfile, run `pnpm install`.
