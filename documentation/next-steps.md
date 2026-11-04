# Next steps

Working log for picking up where the last session stopped. Task-level detail stays in [implementation-plan.md](implementation-plan.md), the schedule in [roadmap.md](roadmap.md). Overwrite this file at the end of each session.

## Stopped at: 2026-11-04 (day 3)

**Done:** the infra pipeline gaps (infra #7, #8) and all of **Phase 3** (design system and layout), in app PRs #10, #11, #13 and the Playwright sweep PR.

- Tokens, fluid type and spacing, self-hosted Inter and JetBrains Mono (Latin and Latin Extended), prose mapped to the tokens (unlayered `.prose`, so it beats the typography plugin's defaults).
- i18n: `/` English, `/de/` German, typed `de.ts`, hreflang, language switch to the equivalent page. Header (details menu, works without JS) with Contact, GitHub, LinkedIn; footer; skip link.
- Components: `Section`, `CTAButton`, `ExternalLink`, `LanguageSwitch`, `CaseStudyCard`, `CaseStudyLayout`, `Diagram`, `SkillGroup`. Favicon set and `site.webmanifest`.
- `tests/e2e` (Playwright + axe, CI job `e2e`): 360/390/768/1280px × light/dark × EN/DE, zero axe violations, no inline scripts or styles. Lighthouse mobile, one-off run: 100 in all four categories on `/` and `/de/`.
- Lesson: do not stack PRs on each other's branches. #12 was stacked on #11, merged into the stale branch and never reached `main`; it was re-applied in #13. Branch from `main`.

## Next

1. **Owner:** add `e2e` to the required checks on `main` after its first green run.
2. **Phase 4, content sections** (see the implementation plan): hero, case studies, diagrams, skills, about, work with me, how this site is built. Needs the Phase 0 content inputs.
3. **Owner:** Phase 0 content inputs (case study notes, screenshots, Impressum details), needed by about D10.
4. Header CV link comes with Phase 5; footer links to How-this-site-is-built, Impressum and Datenschutz come when those pages exist.
5. **Remind the owner at the start of Phase 10** about the Cloudflare Web Analytics site (see loose ends).

## Key rotation

- The `vdd-worker` access key (ends in `...OI3S`) was created on **2026-11-03** and set as Worker secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
- **Rotate by 2027-02-01** (90 days): create a second key in IAM, `wrangler secret put` both values, check the smoke test, then delete the old key. IAM allows two keys per user, so this needs no downtime.

## Small loose ends

- **REMIND THE OWNER at the start of Phase 10:** the Cloudflare Web Analytics site created by an early apply still exists (`auto_install`) but is not in Terraform state (the API token gets 403). Check whether it injects a beacon (the CSP and GDPR rules matter), then decide: keep it, manage it by hand, or delete it. The owner asked to be reminded when we reach Phase 10.
- Phase 0 content inputs are still open: case study notes, screenshots, Impressum details (needed by about D10; Impressum by D20).
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
