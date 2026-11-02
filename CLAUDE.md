# CLAUDE.md

Personal portfolio site for Vedad Dizdarevic (Cloud & DevOps Engineer) at `vedad-dizdarevic.dev`. The site is itself a portfolio project: static site, IaC, CI/CD, monitoring, split across this repo (app) and the sibling `infra` repo.

## Planning docs (source of truth)

| File | Holds |
|---|---|
| [project-scope.md](documentation/project-scope.md) | What the site is for, audiences, must-have features |
| [tech-stack.md](documentation/tech-stack.md) | Technology choices, security headers, cost |
| [implementation-plan.md](documentation/implementation-plan.md) | Phases 0–11 with tasks and "done when" criteria |
| [roadmap.md](documentation/roadmap.md) | Milestones M1–M6, day-by-day schedule, critical path |

Read the relevant doc before changing anything it covers. If a decision changes, update the doc in the same change.

## Current status

- **Stage:** planning done, no code and no infrastructure yet. Both repos (`app/`, `infra/`) are initialised on `main` with no commits and no remotes. Existing content: `documentation/`, `case-studies/` notes, `cv/` PDFs
- **Phase 0 (in progress):** decisions closed (GitHub Actions, React Flow diagrams, Node.js/TypeScript Lambda); AWS, Cloudflare and GitHub accounts exist with MFA; nameservers on Cloudflare (domain registered at Namecheap). SES production access granted. Better Stack monitor created for the apex URL. Purelymail live with `hello@vedad-dizdarevic.dev` (DNS records created by hand; import into Terraform in Phase 7). SPF is a single record; DMARC is at `p=none` with `rua` to `hello@` (set on 2026-11-02; ramp to quarantine ~D13, reject by D23). Open: content inputs, Impressum details
- **Phase 1 (in progress):** app tooling scaffolded on branch `phase-1-scaffolding` (pnpm workspace, ESLint, Prettier, pre-commit with gitleaks, lint CI). Infra `bootstrap/` and `main/` Terraform are written but not applied; AWS account `769814228024` (profile `sorted`) is shared with sorted.onl, resources use the `vdd-` prefix. Repos will be private until launch
- **Next:** infra pre-commit and CI, apply bootstrap, create GitHub repos, protect `main`
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
- **Mobile first:** unprefixed utilities target ~360px; touch targets ≥44px; nothing hover-only.
- **Deploy order:** upload `/_astro/` hashed assets first without `--delete`, then the rest with `--delete`.

## Workflow

- Small PRs, one task each; `main` is always deployable and protected.
- Quality gates (Lighthouse mobile, axe, Playwright, html-validate, Trivy/Checkov, gitleaks) fail the build; don't weaken a threshold to get green.

## Commands

`pnpm install`, `pnpm lint`, `pnpm format:check` (root). Add build, test, and deploy commands here as Phase 2 creates them.
