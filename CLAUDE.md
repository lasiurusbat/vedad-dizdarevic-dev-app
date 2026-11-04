# CLAUDE.md

Personal portfolio site for Vedad Dizdarevic (Cloud & DevOps Engineer) at `vedad-dizdarevic.dev`. The site is itself a portfolio project: static site, IaC, CI/CD, monitoring, split across this repo (app) and the sibling `infra` repo.

## Planning docs (source of truth)

| File | Holds |
|---|---|
| [project-scope.md](documentation/project-scope.md) | What the site is for, audiences, must-have features |
| [tech-stack.md](documentation/tech-stack.md) | Technology choices, security headers, cost |
| [implementation-plan.md](documentation/implementation-plan.md) | Phases 0–11 with tasks and "done when" criteria |
| [roadmap.md](documentation/roadmap.md) | Milestones M1–M6, day-by-day schedule, critical path |
| [next-steps.md](documentation/next-steps.md) | Where the last session stopped and what to do next |

Read the relevant doc before changing anything it covers. If a decision changes, update the doc in the same change.

## Current status

- **Stage:** Phase 1 done (M1); Phase 2 infrastructure applied; **the placeholder is live** at `https://vedad-dizdarevic.dev` (Worker v1, Astro 7, deploy on every push to `main`, smoke test green; M2 reached 2026-11-03). Both repos are public on GitHub (`lasiurusbat/vedad-dizdarevic-dev-app` and `-infra`) with protected `main` (PR required, 0 approvals, required checks, admins included, linear history). `terraform plan` in CI reports no changes
- **Phase 0 (in progress):** decisions closed (GitHub Actions, React Flow diagrams, Node.js/TypeScript Lambda); AWS, Cloudflare and GitHub accounts exist with MFA; nameservers on Cloudflare (domain registered at Namecheap). SES production access granted. Better Stack monitor created for the apex URL. Purelymail live with `hello@vedad-dizdarevic.dev` (DNS records created by hand, imported into Terraform state on 2026-11-02). SPF is a single record; DMARC is at `p=none` with `rua` to `hello@` (set on 2026-11-02; ramp to quarantine ~D13, reject by D23). Open: content inputs, Impressum details
- **Phase 1 (done, M1 reached):** app tooling (pnpm workspace, ESLint, Prettier, pre-commit with gitleaks, lint CI); infra `bootstrap/` applied with state in S3 (`vdd-tfstate-769814228024`); three OIDC roles (`gh-app-deploy`, `gh-infra-plan`, `gh-infra-apply`) pinned to immutable GitHub subjects (`repo:<owner>@<ownerId>/<repo>@<repoId>`, not repo names, or `AssumeRoleWithWebIdentity` fails); `terraform plan` for `infra/main` runs in CI through OIDC. AWS account `769814228024` (profile `sorted`, `aws login`) is shared with sorted.onl; resources use the `vdd-` prefix
- **Phase 2 infra (applied 2026-11-02):** site bucket, `vdd-worker` IAM user (no access key yet), contact Lambda and function URL, SES identity, SNS alerts, budget, Cloudflare zone settings, rulesets and Turnstile; existing zone and Purelymail/DMARC DNS records imported into state. Lambda concurrency is not reserved (AWS rejects it on this account). Cloudflare Web Analytics is not in Terraform (403 on the API; revisit in Phase 10). Infra Actions variables and the `CLOUDFLARE_API_TOKEN` secret are set; app Actions variables are set except the app Cloudflare token
- **Phase 2 app side (done 2026-11-03):** Worker v1 (`worker/`, 37 tests), the Astro 7 placeholder (`site/`), app CI (`lint`, `secrets`, `site`, `worker`, all required) and the deploy workflow (`.github/workflows/deploy.yml`) with the smoke test (`tests/smoke`). The app Cloudflare token is `CLOUDFLARE_API_TOKEN`; the `vdd-worker` access key (created 2026-11-03) is only in Worker secrets, rotate by 2027-02-01. Local Node is managed with fnm; Astro 7 needs Node >= 22.23.4. The deploy job has no GitHub `environment:` on purpose: the deploy role trusts only the `ref:refs/heads/main` OIDC subject
- **Infra pipeline (done 2026-11-03):** apply workflow with `production` environment, Trivy/Checkov, plan as a PR comment (infra #7, #8).
- **Phase 3 (design system and layout, done 2026-11-04):** tokens, fonts, i18n routing (`/` and `/de/`), header/footer, components, favicons and the Playwright sweep (`tests/e2e`, CI job `e2e`). Open: the CV link (Phase 5) and footer links to How-this-site-is-built, Impressum, Datenschutz (added when those pages exist)
- **Next:** Phase 4 (content sections). Add the `e2e` check to the required checks on `main` after its first green run. Phase 0 still has content inputs open (case study notes, screenshots, Impressum details); reminder for Phase 10: the untracked Cloudflare Web Analytics site
- **Pace:** full-time, 8–10 h/day; launch targeted for D23 (see [roadmap.md](documentation/roadmap.md))

Update this section when a milestone completes.

## Architecture in one line

Browser → Cloudflare (DNS, CDN, TLS, Worker) → private S3 in `eu-central-1` via SigV4; `/api/contact` → Worker → Lambda function URL (`AWS_IAM` auth) → SES.

## Folder split

- **App files** go in this folder (`/home/vedad/DevProjects/vedad-dizdarevic.dev/app`): `site/`, `worker/`, `lambda/contact/`, `case-studies/`, `cv/`, `tests/`, `.github/workflows/`.
- **Infrastructure files** go in the sibling folder `/home/vedad/DevProjects/vedad-dizdarevic.dev/infra` (its own separate git repo, outside this one): `bootstrap/` and `main/` Terraform. Commit infra changes in that repo, app changes here.

The layout tree in [implementation-plan.md](documentation/implementation-plan.md#repository-layout) shows both repos.

## Planned layout

`site/` Astro · `worker/` Cloudflare Worker · `lambda/contact/` · `cv/` Typst · diagrams: React Flow in `site/src/diagrams/` · `tests/e2e` + `tests/smoke` · `.github/workflows/`; Terraform in `../infra/bootstrap` + `../infra/main`. Full tree in the implementation plan.

## Rules that are easy to break

- **Terraform vs Wrangler:** Terraform manages AWS and Cloudflare zone/DNS/rules; the Worker script and route are deployed with Wrangler only. Never manage the same resource with both.
- **Security headers live in the Worker only**, not in the Cloudflare dashboard or Astro. CI asserts all six.
- **No `'unsafe-inline'`:** Astro uses `build.inlineStylesheets: 'never'`; CSP stays `style-src 'self'`. Don't add third-party origins without a reason.
- **No long-lived AWS keys in CI:** GitHub Actions uses OIDC. The Worker IAM user's key is the one exception; it lives only in Worker secrets, never in Terraform outputs or the repo.
- **GDPR:** EU region, self-hosted fonts (Fontsource), cookieless analytics. No Google Fonts or other trackers.
- **Bilingual:** `/` is EN, `/de/` is DE. User-facing strings go in `site/src/i18n/{en,de}.ts`; hero, contact and work-with-me must exist in both.
- **Tailwind v4:** CSS-first config in `site/src/styles/global.css` (`@theme`), no `tailwind.config.js`. Use semantic tokens (`bg-bg text-fg`) instead of `dark:` on every element; extract components, not `@apply` classes.
- **Case studies:** MDX in `site/src/content/case-studies/{en,de}/<slug>.mdx` (schema in `site/src/content.config.ts`, language = folder). `draft: true` entries are left out of production builds; `SHOW_DRAFTS=1` includes them (the e2e build sets it). No invented facts: content comes from the owner's notes.
- **Mobile first:** unprefixed utilities target ~360px; touch targets ≥44px; nothing hover-only.
- **Deploy order:** upload `/_astro/` hashed assets first without `--delete`, then the rest with `--delete`.

## Workflow

- Small PRs, one task each; `main` is always deployable and protected.
- Quality gates (Lighthouse mobile, axe, Playwright, html-validate, Trivy/Checkov, gitleaks) fail the build; don't weaken a threshold to get green.

## Commands

`pnpm install`, `pnpm lint`, `pnpm format:check` (root). Site: `pnpm --filter @vdd/site dev | check | build | preview`. Worker: `pnpm --filter @vdd/worker test` (Vitest in the Workers runtime), `pnpm --filter @vdd/worker typecheck` (runs `wrangler types` first; the generated `worker-configuration.d.ts` is git-ignored). Smoke test against the live site: `SITE_BUCKET=<bucket> node --test "tests/smoke/*.test.mjs"` (`BASE_URL` overrides the target). End-to-end checks (Playwright + axe, builds the site and serves `site/dist`): `pnpm --filter @vdd/e2e test` (first run on a machine: `pnpm --filter @vdd/e2e exec playwright install chromium`); screenshots land in `tests/e2e/screenshots/`. Deploys run from `.github/workflows/deploy.yml` on every push to `main`.
