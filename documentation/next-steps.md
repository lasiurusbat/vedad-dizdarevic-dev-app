# Next steps

Working log for picking up where the last session stopped. Task-level detail stays in [implementation-plan.md](implementation-plan.md), the schedule in [roadmap.md](roadmap.md). Overwrite this file at the end of each session.

## Stopped at: 2026-11-03 (day 2)

**Done today:** the app side of Phase 2. **The placeholder is live** at `https://vedad-dizdarevic.dev` (M2 reached on day 2; the target was D6).

- **#4 Worker v1** (`worker/`): SigV4 fetch to the private bucket with `aws4fetch` (one retry), clean-URL mapping, `/foo` to `/foo/` 301 only when the page exists, `404.html`, 502 on S3 errors, GET/HEAD only, Cache API rules, six security headers with the CSP in report-only mode. 37 tests in the Workers runtime.
- **#5 Astro placeholder** (`site/`): Astro 7, Tailwind v4 with semantic tokens, `/` and `404.html`, no inline styles or scripts in the output.
- **#6 App CI:** `site` and `worker` jobs. All four checks (`lint`, `secrets`, `site`, `worker`) are required on `main`.
- **#8 Smoke tests and deploy workflow:** first deploy green. Checked by hand as well: `/` 200 with all six headers, a missing path 404, direct bucket access 403.
- App Cloudflare token set as `CLOUDFLARE_API_TOKEN`; `vdd-worker` access key created and set as Worker secrets (see below); Node upgraded to 22.23.4 through fnm.

## Next

1. **Infra pipeline gaps (infra repo):** apply workflow (`production` environment, `gh-infra-apply`, concurrency without cancelling a running apply), Trivy and Checkov on PRs, plan as a PR comment.
2. **Phase 3, design system and layout** (see the implementation plan): tokens, fonts through Fontsource, header and footer, i18n routing with `de.ts`.
3. **Owner:** Phase 0 content inputs (case study notes, screenshots, Impressum details), needed by about D10.

## Key rotation

- The `vdd-worker` access key (ends in `...OI3S`) was created on **2026-11-03** and set as Worker secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
- **Rotate by 2027-02-01** (90 days): create a second key in IAM, `wrangler secret put` both values, check the smoke test, then delete the old key. IAM allows two keys per user, so this needs no downtime.

## Small loose ends

- Better Stack will alert until the first deploy; that is expected.
- The Cloudflare Web Analytics site created by an early apply still exists (`auto_install`) but is not in Terraform state. Check whether it injects a beacon, and decide in Phase 10.
- Phase 0 content inputs are still open: case study notes, screenshots, Impressum details (needed by about D10; Impressum by D20).
- `de.ts` does not exist yet; the placeholder strings are in `site/src/i18n/en.ts`.
- Node 20 deprecation warning in the deploy run (`configure-aws-credentials@v5`, `pnpm/action-setup@v4`); bump the actions when newer majors exist.
- The Worker maps S3 403 to the 404 page, so a broken key would show as 404s; the smoke test's 200 on `/` is what catches that.
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
