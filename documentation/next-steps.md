# Next steps

Working log for picking up where the last session stopped. Task-level detail stays in [implementation-plan.md](implementation-plan.md), the schedule in [roadmap.md](roadmap.md). Overwrite this file at the end of each session.

## Stopped at: 2026-11-02 (end of day 1)

**Done today:** Phase 0 except content inputs; all of Phase 1 (M1 reached); the infrastructure part of Phase 2.

- Both repos are public with protected `main`; app CI (lint, format, gitleaks) and infra CI (fmt, validate, gitleaks, plan through OIDC) are green.
- `infra/bootstrap` is applied, with its state in S3. The three `gh-*` OIDC roles are pinned to immutable GitHub subjects.
- `infra/main` is applied: site bucket, `vdd-worker` IAM user (no key yet), contact Lambda and function URL, SES, SNS alerts, budget, Cloudflare zone settings, redirect and rate-limit rules, Turnstile. The existing zone and Purelymail/DMARC records were imported. CI `terraform plan` says "No changes".
- No site, Worker or app pipeline code exists yet. The live URL has no Worker, so it does not serve a page.

**Open PRs to merge first** (squash and merge on GitHub; the assistant cannot merge):

- app #3: docs status, this file
- infra #6: README status and gotchas

**Small loose ends**

- Confirm the SNS alert subscription (done) and that alarm mail reaches `ALERT_EMAIL`.
- The Cloudflare Web Analytics site created by an early apply still exists in Cloudflare (`auto_install`), but is not in Terraform state. Check whether it injects a beacon, and decide in Phase 10.
- Phase 0 content inputs are still open: case study notes, screenshots, Impressum details. They are needed by about D10 (Impressum by D20).

## Tomorrow: Phase 2 app side (walking skeleton)

Order matters; each step is a small PR.

1. **Owner, before coding (about 10 min):**
   - Create the app-repo Cloudflare token (Account: Workers Scripts Edit; Zone: Workers Routes Edit, Cache Purge) scoped to this zone and account. Store it as the app repo secret `CLOUDFLARE_API_TOKEN`. Never paste it in chat.
   - Create the access key for IAM user `vdd-worker` in the AWS console. It goes only into Worker secrets (`wrangler secret put`), never into chat, Terraform or the repo.
2. **Worker v1** (`worker/`): path mapping, `aws4fetch` SigV4 fetch to S3, 404/5xx handling, GET/HEAD only, Cache API rules, security headers module (CSP in report-only), Vitest tests. Check current docs with Context7 (Wrangler, `aws4fetch`, Vitest pool for Workers).
3. **Astro placeholder** (`site/`): static output, `trailingSlash: 'always'`, `build.format: 'directory'`, `build.inlineStylesheets: 'never'`, Tailwind v4 via `@tailwindcss/vite`, one page and a custom `404.html`. Verify current Astro and Tailwind versions and config with Context7. Then add `tailwindStylesheet` to `.prettierrc.json`.
4. **App CI:** PR workflow (build site, test Worker). Do not enable the deploy workflow until steps 1 to 3 are merged.
5. **App deploy workflow** on `main`: build, upload `/_astro/` first without `--delete`, then everything else with `--delete`, `wrangler deploy`, cache purge, smoke test (`tests/smoke`: 200 on `/`, 404 on a random path, 301 from `www` and from `http`, all six headers, bucket returns 403 when accessed directly).
6. **Infra pipeline gaps:** apply workflow (`production` environment, `gh-infra-apply`, concurrency without cancelling a running apply), Trivy and Checkov on PRs, plan as a PR comment.

**Phase 2 is done when** a commit to `main` changes the live placeholder within minutes, the smoke test passes, and the bucket returns 403 on direct access (see the implementation plan).

## How to run things locally (reminder)

- AWS: `aws login --profile sorted` (the session expires; `AWS_PROFILE=sorted` for Terraform). The MCP AWS tools use the same account.
- Terraform in `infra/main`: needs `terraform.tfvars` (git-ignored, already filled in) and `CLOUDFLARE_API_TOKEN` exported in the shell. Use `terraform plan -out=tfplan` then `terraform apply tfplan`. Run `terraform` from `infra/main`, not from the repo root.
- The owner runs commands that touch secrets or the live account (imports, applies). The assistant prepares the exact commands and reviews the output.
- `pnpm install`, `pnpm lint` and `pnpm format:check` work in `app/`. `documentation/`, `case-studies/` and `CLAUDE.md` are excluded from Prettier.

## Decisions and gotchas worth remembering

- OIDC subjects are immutable (`repo:<owner>@<ownerId>/<repo>@<repoId>`); trust policies pin numeric IDs. A repo rename or recreate means updating `infra/bootstrap` variables.
- AWS account `769814228024` is shared with sorted.onl. Everything here is prefixed `vdd-`.
- Lambda concurrency is not reserved (AWS rejects it on this account).
- Cloudflare returns TXT content quoted; TXT `content` in Terraform uses escaped quotes.
- A variable missing in CI (for example `purelymail_ownership_proof`) causes a spurious plan diff, and could cause a destructive apply.
- Terraform token cannot manage Cloudflare Web Analytics (403). Not in Terraform for now.
