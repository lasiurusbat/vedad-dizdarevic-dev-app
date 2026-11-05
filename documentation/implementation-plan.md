# Implementation Plan | vedad-dizdarevic.dev

How to build the site described in [project-scope.md](project-scope.md) with the stack in [tech-stack.md](tech-stack.md).

## Approach

1. **Walking skeleton first.** Get a one-line page live on the real domain, through the real pipeline (S3 → Worker → Cloudflare, deployed by CI), before building any features. Every later phase ships through that path, so infrastructure problems surface in week one, not at launch.
2. **Quality gates early.** Lighthouse, accessibility and security-header checks go into CI as soon as there is a page to test, and the build fails when they regress.
3. **Content in parallel.** Writing case studies, drawing diagrams and porting the CV take longer than the code. Start them in Phase 0 and keep them running alongside the build.
4. **Small PRs on `main`.** Each task below is roughly one PR. `main` is always deployable.
5. **Two repositories.** The app (site, Worker, Lambda, CV, diagrams, tests) lives in `app/`; Terraform lives in a separate `infra/` repo next to it. Throughout this plan, `infra/bootstrap` and `infra/main` mean the `bootstrap/` and `main/` stacks in the **infra repo**, and every Terraform task, plan, apply and IaC scan runs in that repo's CI. The app repo's CI only builds, tests and deploys content.

## Phase overview

| Phase | Outcome | Depends on |
|---|---|---|
| 0. Prerequisites | Accounts, domain, decisions, content inputs started | — |
| 1. Repositories and bootstrap | App and infra repos, tooling, Terraform state, CI identities | 0 |
| 2. Walking skeleton | Placeholder page live on the domain via CI, headers in report-only | 1 |
| 3. Design system and layout | Mobile-first tokens, layout, header CTAs, dark mode, EN/DE routing | 2 |
| 4. Content sections | Hero, case studies, skills, about, work with me, how this site is built | 3 |
| 5. CV from Typst | EN + DE PDFs built in CI, linked from the site | 1 (can run alongside 3–4) |
| 6. Contact form | Worker → Lambda → SES with Turnstile | 2, SES production access |
| 7. Email and DNS | Mailbox, SPF/DKIM/DMARC | 1 |
| 8. SEO and social | Sitemap, `hreflang`, JSON-LD, OG images | 4 |
| 9. Hardening and quality gates | CSP enforced, all gates green, legal pages | 4, 6, 8 |
| 10. Monitoring and operations | Uptime, alarms, budget, key rotation, runbook | 2, 6 |
| 11. Launch | Checklist complete, link shared | all |

---

## Phase 0: Prerequisites

### Decisions to confirm

| Decision | Default in this plan | Notes |
|---|---|---|
| CI platform | GitHub Actions | Switch to GitLab CI if the flagship repos live on GitLab; the pipeline steps are identical |
| Domain registrar | Keep current registrar, point nameservers to Cloudflare | Or transfer to Cloudflare Registrar (at-cost pricing) |
| Mailbox provider | Purelymail | Needed before DMARC goes to `p=reject` |
| Diagram tool | **React Flow** (`@xyflow/react`) with AWS Architecture Icons | Decided in Phase 0 (replaces D2). Interactive island, higher JS budget on diagram pages only; see [tech-stack.md](tech-stack.md#diagrams) |
| Lambda runtime | Node.js (current LTS), TypeScript | **Confirmed.** Same language as the Worker and site |
| Third case study | sorted.onl + rainalert.live, plus optionally this site | This site makes a natural third |

### Accounts and access

- [x] AWS account with MFA on root; an admin IAM Identity Center user for local work (no root usage)
- [x] Cloudflare account with MFA; domain (registered at Namecheap) added as a zone; nameservers switched at the registrar (verified with `dig`)
- [x] GitHub account with MFA
- [x] Uptime monitoring account: Better Stack, monitor created for `https://vedad-dizdarevic.dev` (expect alerts until the Phase 2 skeleton is live; add the `/de/` and keyword checks in Phase 10)
- [x] Mailbox provider account: Purelymail, `hello@vedad-dizdarevic.dev` live

### Start early (long lead times)

- [x] **SES production access** for `eu-central-1` (granted; out of the sandbox)
- [ ] **Content inputs** (see [Content inputs](#content-inputs) at the end): case study notes, screenshots, Impressum details

### Done when

Domain resolves through Cloudflare, all accounts exist with MFA, and the decisions table has no open rows.

---

## Phase 1: Repositories and bootstrap

### Repository layout

Two sibling folders under `vedad-dizdarevic.dev/`, each its own git repo with a protected `main`:

```
vedad-dizdarevic.dev/
├── app/                          # app repo
│   ├── CLAUDE.md
│   ├── README.md
│   ├── documentation/            # project-scope, tech-stack, implementation-plan, roadmap, runbook
│   ├── site/                     # Astro project
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── content/          # case studies (MDX), per language
│   │   │   ├── diagrams/         # React Flow nodes/edges as typed data, AWS icon SVGs
│   │   │   ├── i18n/             # UI strings EN/DE
│   │   │   ├── layouts/
│   │   │   ├── pages/            # / and /de/
│   │   │   └── styles/           # global.css: Tailwind import, @theme tokens, base layer
│   │   ├── public/               # fonts, favicon, robots.txt
│   │   └── astro.config.mjs
│   ├── worker/                   # Cloudflare Worker (TypeScript)
│   │   ├── src/
│   │   ├── test/
│   │   └── wrangler.toml
│   ├── lambda/
│   │   └── contact/              # contact form handler (TypeScript)
│   ├── case-studies/             # source notes per project: cs_sorted/, cs_rainalert/, cs_vedad-dizdarevic-dev/ (notes + screenshots/{light,dark}); written up as MDX in site/src/content/
│   ├── cv/
│   │   ├── template.typ
│   │   ├── data.yaml             # CV content, EN + DE
│   │   ├── fonts/
│   │   └── reference/            # existing PDFs (currently loose in cv/), removed after the port
│   ├── tests/
│   │   ├── e2e/                  # Playwright (layout, screenshots, a11y)
│   │   └── smoke/                # post-deploy checks against the live site
│   └── .github/workflows/        # build, test, deploy site + Worker
└── infra/                        # infra repo
    ├── bootstrap/                # state bucket + CI OIDC roles (applied once, locally)
    ├── main/                     # everything else
    └── .github/workflows/        # fmt, validate, Trivy/Checkov, plan, apply
```

### Tasks

- [x] Both repos are initialised locally (`app/` on `main`, `infra/` on `main`); create the two remote repos (both public, as of 2026-11-02: branch protection is unavailable on private repos on the free plan) and protect `main` in each (PR required, 0 approvals since this is a solo repo, required status checks, admins included, linear history)
- [x] Move existing CV PDFs to `cv/reference/`
- [x] Tooling: Node.js LTS pinned via `.nvmrc`, pnpm workspaces for `site`, `worker`, `lambda/contact`; Typst version pinned in CI. In the infra repo: Terraform version pinned via `.terraform-version`
- [x] Editor and lint config: Prettier (with `prettier-plugin-tailwindcss`), ESLint, `.editorconfig` and `pre-commit` hooks (formatting, trailing whitespace, secret scanning with gitleaks) in the app repo; `terraform fmt`, `.editorconfig` and the same `pre-commit` hooks in the infra repo
- [x] `README.md` in each repo: what the repo is, how to run locally, how deploys work (the app README links to the infra repo and back)
- [x] **`infra/bootstrap`** in the infra repo (applied locally, once):
  - S3 bucket for Terraform state (versioning, encryption, Block Public Access, TLS-only policy)
  - GitHub OIDC identity provider (already existed in the shared AWS account, so referenced by a data source) and CI roles, each with trust limited to one repo and ref. New repos get **immutable OIDC subjects** (`repo:<owner>@<ownerId>/<repo>@<repoId>:...`), so trust pins the numeric owner and repo IDs, not names:
    - infra repo, `main`: apply role; infra repo, PRs: plan-only role
    - app repo, `main`: deploy role (write to the site bucket only; no access to Terraform state)
- [x] **`infra/main`** skeleton: backend config (`use_lockfile = true`), providers (`hashicorp/aws` in `eu-central-1`, `cloudflare/cloudflare`), variables, default tags
- [ ] Cloudflare API tokens, one per repo, stored as CI secrets:
  - [x] infra repo (`CLOUDFLARE_API_TOKEN` secret): this zone's DNS, zone settings, rules and Turnstile. Web Analytics management returned 403 even with Account Settings Edit and Account Analytics Read, so it is not managed in Terraform for now (see Phase 10)
  - [x] app repo (`CLOUDFLARE_API_TOKEN` secret): Account Workers Scripts Edit; Zone Workers Routes Edit and Cache Purge. If the first deploy fails with a 403 on an account lookup, add Account Settings Read
- [x] Hand-off from infra to app: after the first apply, copy the non-secret outputs (site bucket name, deploy role ARN, Cloudflare zone ID) into app repo Actions variables (done: `SITE_BUCKET`, `AWS_DEPLOY_ROLE_ARN`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_ACCOUNT_ID`, `TURNSTILE_SITE_KEY`, `AWS_REGION`)
- [x] First CI workflows: app repo (install, lint, gitleaks); infra repo (`terraform fmt -check` + `validate`, gitleaks, and `terraform plan` through OIDC)

### Done when

Both repos exist with protected `main`, app CI runs lint on PRs, and `terraform plan` for `infra/main` runs in the infra repo's CI through OIDC with no stored AWS keys.

---

## Phase 2: Walking skeleton

Goal: a placeholder page served at `https://vedad-dizdarevic.dev` through the final architecture, deployed by CI.

### Infrastructure (`infra/main`, infra repo)

- [x] Site bucket in `eu-central-1`: private, Block Public Access, versioning, SSE-S3, lifecycle rule expiring noncurrent versions after 30 days
- [x] Bucket policy: TLS only; read allowed only for the Worker IAM user; write only for the app repo's CI deploy role
- [x] Worker IAM user (access key created 2026-11-03 and stored as Worker secrets; rotate by 2027-02-01) with `s3:GetObject` on the site bucket (later also `lambda:InvokeFunctionUrl` on the contact function, Phase 6); access key created and stored as Worker secrets (`wrangler secret put`), never in Terraform state outputs or the repo
- [x] Cloudflare zone settings: SSL **Full (strict)**, Always Use HTTPS, minimum TLS 1.2, TLS 1.3 on, HTTP/3 on, Brotli on
- [x] DNS: apex and `www` proxied records (the Worker route handles requests)
- [x] Redirect Rule: `www` → apex (301, path and query preserved)

### Astro placeholder

- [x] Astro 7 project in `site/` (needs Node >= 22.23.4), static output, `trailingSlash: 'always'`, `build.format: 'directory'`, `build.inlineStylesheets: 'never'`
- [x] Tailwind CSS v4: install `tailwindcss` + `@tailwindcss/vite`, add the Vite plugin in `astro.config.mjs`, create `src/styles/global.css` with `@import "tailwindcss";`, import it in the base layout
- [x] One page (`/`) and a custom `404.html`

### Worker v1

- [x] Route `vedad-dizdarevic.dev/*` (in `wrangler.toml`; takes effect on the first deploy)
- [x] Path mapping: `/` → `index.html`, `/foo/` → `foo/index.html`, `/foo` → 301 to `/foo/` when `foo/index.html` exists
- [x] Fetch from `https://<bucket>.s3.eu-central-1.amazonaws.com/<key>` signed with `aws4fetch`; stream body; pass through `Content-Type`, `ETag`, `Last-Modified`
- [x] S3 `403`/`404` (a private bucket without `s3:ListBucket` answers 403 for a missing key) → serve `404.html` with status 404; S3 `5xx` → 502 with a minimal error page
- [x] Only `GET` and `HEAD` for static paths; everything else 405
- [x] Cache rules via the Cache API:
  - `/_astro/*` (content-hashed): `Cache-Control: public, max-age=31536000, immutable`
  - HTML: short edge TTL, `Cache-Control: public, max-age=0, must-revalidate` for browsers; purged on deploy
  - PDFs, fonts, images: 1 day
- [x] Security headers module with all six headers; CSP sent as **`Content-Security-Policy-Report-Only`** for now
- [x] Vitest tests (`@cloudflare/vitest-plugin`; `vitest-pool-workers` is deprecated): path mapping, 404 handling, method handling, header presence, caching

### Pipeline v1

- [ ] Infra repo PR workflow: `terraform fmt -check`, `validate`, Trivy/Checkov, `terraform plan` as a PR comment
- [ ] Infra repo `main` workflow: `terraform apply` (protected `production` environment; manual approval is optional at this size)
- [x] App repo PR workflow: `site` (astro check + build) and `worker` (typecheck + tests) jobs. Add both to the required checks in branch protection after their first green run
- [x] App repo `main` workflow (`.github/workflows/deploy.yml`; the job has no `environment:` because the deploy role trusts only the `refs/heads/main` OIDC subject), in order:
  1. Build site
  2. Upload to S3 in two passes: hashed assets (`/_astro/`) first **without** `--delete`, then everything else with `--delete` excluding `/_astro/` (old hashed assets stay available to cached HTML; pruned by a lifecycle rule or a scheduled job)
  3. `wrangler deploy`
  4. Cloudflare cache purge (purge everything is fine at this size)
  5. Smoke test (`tests/smoke`): `200` on `/`, `404` on a random path, `301` from `www`, `301` from `http`, all six headers present
- [ ] Concurrency control in each repo (app deploy done; infra apply pending): one deploy (or apply) at a time, newer runs cancel queued ones. Apply never cancels a run in progress

### Done when

A commit to `main` changes the live placeholder within minutes, the smoke test passes, and the bucket returns `403` when accessed directly. **Met for the app side on 2026-11-03** (first deploy green); the infra pipeline items above are still open.

---

## Phase 3: Design system and layout

### Tasks

- [x] **Design tokens** in `@theme` (`styles/global.css`): brand palette, font families, fluid type scale and spacing with `clamp()`, radii, focus ring
- [x] **Semantic colour tokens** (`bg`, `fg`, `muted`, `accent`, `border`) whose values switch under `@media (prefers-color-scheme: dark)`, so components use `bg-bg text-fg` rather than `dark:` on every element
- [x] `@tailwindcss/typography` added via `@plugin`; prose styles mapped to the semantic tokens for case study MDX
- [x] Check colour contrast for both themes (WCAG AA minimum, AAA for body text where possible)
- [x] **Fonts:** pick at most two families, self-host via Fontsource, subset to Latin + Latin Extended (German characters), `font-display: swap`, preload the body font
- [x] **Base layer** (`@layer base`): Tailwind's Preflight reset plus readable measure (~65–75ch), visible focus states (`focus-visible:`), `motion-safe:`/`motion-reduce:` for any animation
- [x] **Layout:** mobile-first single column at ~360px using unprefixed utilities; `md:`/`lg:` and container-query variants (`@container`, `@md:`) for wider screens
- [x] Keep components in Astro files with utilities; extract repeated patterns into components, not `@apply` classes
- [ ] **Header with CTAs:** name, section nav, language switch, and Contact / CV / GitHub / LinkedIn reachable on every screen; on mobile a compact sticky header or bottom bar; works without JavaScript _(In progress: name, section nav, language switch, Contact, GitHub and LinkedIn done, works without JS. The CV link follows with the CV, Phase 5.)_
- [ ] **Footer:** links, "How this site is built", Impressum, Datenschutz _(In progress: copyright, GitHub and LinkedIn done. "How this site is built", Impressum and Datenschutz links are added when those pages exist (Phases 4 and 9), to avoid dead links.)_
- [x] **i18n:** Astro i18n routing with `defaultLocale: 'en'`, `locales: ['en', 'de']`; `/` English, `/de/` German; UI strings in `src/i18n/{en,de}.ts`; language switch links to the equivalent page; `<html lang>` set per page
- [x] **Geo-based first language** (DE, AT, CH, LU, LI to `/de/`, everyone else English): in the Worker, no cookie; see tech-stack.md, Cloudflare Worker, item 5
- [x] Skip-to-content link, semantic landmarks, heading hierarchy
- [x] Favicon set (SVG + PNG fallback) and `site.webmanifest` _(sources in `site/icons-src/`; PNGs and `favicon.ico` were rendered from them with headless Chromium. Edit the SVG, regenerate, commit.)_

### Components to build

`Header`, `Footer`, `LanguageSwitch`, `Section`, `CaseStudyCard`, `CaseStudyLayout`, `Diagram` (responsive SVG + full-size link), `SkillGroup`, `CTAButton`, `ExternalLink`

_Built (Phase 3): all of the above. `CaseStudyLayout` is in `layouts/`; `Diagram` takes a static SVG for now, and Phase 4 decides how React Flow renders into it. Components that sit inside MDX prose are marked `not-prose`._

### Done when

Placeholder sections render correctly at 360, 390, 768 and 1280px in both themes and both languages, with no horizontal scroll and Lighthouse accessibility at 100.

**Status: met (2026-11-04).** `tests/e2e` (Playwright + axe, run in CI as the `e2e` job) checks 360/390/768/1280px × light/dark × EN/DE: no horizontal scroll, Contact and the language switch reachable, header touch targets ≥44px, zero axe violations (also with the menu open and on the 404 page), menu works without JS, skip link, no inline scripts or styles. A one-off Lighthouse mobile run on `/` and `/de/` scored 100 in all four categories. Lighthouse in CI with budgets is still Phase 9.

---

## Phase 4: Content sections

Single page with anchored sections, plus a detail page per case study.

### Hero

- [x] Name, role (Cloud & DevOps Engineer), one-line positioning that uses the 3D/CGI + production infrastructure background _(draft copy, owner to review)_
- [x] Clear availability line: open to full-time roles and freelance work
- [ ] Primary CTAs: Contact, Download CV _(Contact, GitHub and LinkedIn done; the CV button renders once `CV_URL` in `site/src/site.ts` is set, Phase 5)_
- [x] EN + DE

### Case studies

- [x] Content collection schema (`src/content.config.ts`): title, summary, problem, stack (list), decisions (list of `{decision, why}`), outcome metrics, repo URL, live/visual links, diagram reference, language  _(Done: `site/src/content.config.ts`; one MDX file per language in `site/src/content/case-studies/{en,de}/<slug>.mdx`, the language is the folder, `draft: true` hides an entry from production builds; a generic draft `example` entry exists only to test the layout, delete it when the first real case study lands.)_
- [x] Case study 1: **sorted.onl** _(English done in PR #19; German pending. Demo-data screenshots as light/dark pairs; repo is private, so the page says so.)_
- [ ] Case study 2: **rainalert.live**
- [ ] Case study 3 (optional): **this site**
- [ ] Each has: problem in 1–2 sentences, architecture diagram, stack, 2–3 decisions with trade-offs (cost, security, reliability), outcome, links to repo and something live (pipeline run, Grafana screenshot)
- [x] Cards on the main page, full write-up on `/projects/<slug>/`  _(Done: cards in the work section, pages at `/projects/<slug>/` and `/de/projects/<slug>/`, language switch and hreflang only for translations that exist.)_
- [ ] German versions: at least summaries on the cards; full translations optional at launch

### Diagrams

- [x] **Spike first (½ d), done 2026-11-05:** `@astrojs/react` + `@xyflow/react` in Astro with one diagram; measure gzipped JS, confirm it works under the report-only CSP (no inline-style violations; try `client:only="react"`), decide the diagram-page JS budget
  _Result: `@astrojs/react` and `client:only` fail the CSP (Astro's island wrapper emits an inline script, an inline `<style>` and a `style` attribute). Use a plain module script instead (`site/src/diagrams/mount.ts`): it mounts React Flow when the diagram scrolls into view, so there is no inline code and `script-src 'self'` / `style-src 'self'` stay unchanged. Cost on a diagram page: about 128 KB gzipped (React Flow 60, react-dom 64, loader and CSS 4); pages without a diagram load none of it. Proposed diagram-page JS budget: 140 KB gzipped. Mobile: the diagram keeps a readable width inside a keyboard-focusable, sideways-scrolling wrapper, because shrinking it to 360px makes the text about 5px. `tests/e2e/diagram.spec.ts` enforces the production CSP and fails on any violation._
- [ ] Diagram component renders typed nodes/edges from `site/src/diagrams/`; AWS Architecture Icons stored locally as SVGs; hydrated only where used
- [ ] Light/dark: node and edge colours use the semantic tokens
- [ ] Each diagram has a text alternative (short description of the flow) and a static fallback image for `<noscript>` and pre-hydration
- [ ] Mobile: fit-to-view on load, touch pan/zoom doesn't trap page scroll; complex diagrams get a simplified layout

### Skills

- [ ] Grouped by area: Cloud, IaC, CI/CD, Containers, Observability (plus others as needed); no bars or percentages
- [x] DevOps diploma shown _(Certifications block under Skills: claims plus verification links, PDFs not published; AWS SAA shown as in progress)_
- [ ] Sourced from `cv/data.yaml` if the shared-data option is taken (Phase 5)

### About

- [ ] Short path from 3D/CGI to DevOps, what you're aiming for, languages, a line of personality (games, books, biking, coffee)
- [ ] Optional photo (optimized, with alt text)

### Work with me

- [ ] Separate from the job pitch: what you offer, problems you solve, how fast you can start, how to begin a conversation
- [ ] CTA to the contact form (Phase 6) or a booking link
- [ ] EN + DE

### How this site is built

- [ ] Architecture diagram of this site (Cloudflare → Worker → S3, contact flow)
- [ ] Key decisions: Worker over CloudFront/public S3, Cloudflare free plan, `eu-central-1`, Typst CV, security headers
- [ ] Live evidence: CI status badge, Lighthouse scores, securityheaders.com grade, link to the repo

### Done when

All sections exist with real content in English, hero / work with me / contact exist in German, and every external link resolves.

---

## Phase 5: CV from Typst

Can run alongside Phases 3–4.

### Tasks

- [ ] Define `cv/data.yaml` schema: personal info, summary, experience, projects, skills, education (including the DevOps diploma), languages; each text field with `en` and `de`
- [ ] Port content from `cv/reference/Vedad_Dizdarevic_CV_{EN,DE}_1026.pdf` into `data.yaml`
- [ ] `cv/template.typ`: reads the YAML, takes `lang` as an input (`typst compile --input lang=de`)
- [ ] Match or improve the layout of the reference PDFs; fonts committed in `cv/fonts/` and passed via `--font-path`
- [ ] PDF metadata: title, author, language
- [ ] CI: compile both languages, fail the build on errors, copy outputs to `site/public/cv/` as `Vedad_Dizdarevic_CV_EN.pdf` and `Vedad_Dizdarevic_CV_DE.pdf`
- [ ] Site links the CV in the current page language
- [ ] Optional: site's skills/experience read `cv/data.yaml` (Astro can import YAML via a loader)
- [ ] Remove `cv/reference/` once both PDFs are approved

### Done when

Both PDFs build in CI, look at least as good as the reference versions, and download from the site in the right language.

---

## Phase 6: Contact form

### Flow

```
Browser form ──POST /api/contact──▶ Worker ──verify Turnstile──▶ Cloudflare siteverify
                                      │
                                      └──SigV4 POST──▶ Lambda function URL (AWS_IAM auth) ──▶ SES ──▶ your inbox
```

### Infrastructure

- [ ] SES domain identity in `eu-central-1` with DKIM (CNAMEs in Cloudflare DNS via Terraform), custom MAIL FROM subdomain
- [ ] SES production access (requested in Phase 0)
- [ ] Lambda function (Node.js LTS, arm64, 128 MB, short timeout), function URL with **`AWS_IAM`** auth
- [ ] Lambda role: `ses:SendEmail` limited to the verified identity, CloudWatch Logs with 30-day retention
- [ ] Worker IAM user gets `lambda:InvokeFunctionUrl` on this function only
- [ ] Lambda reserved concurrency set low (e.g. 2) as a cost and abuse cap
- [ ] Turnstile widget managed in Terraform; site key in the site build, secret key as a Worker secret

### Worker

- [ ] `POST /api/contact` only; reject other methods
- [ ] Validate `Origin` header matches the site
- [ ] Verify Turnstile token server-side before anything else
- [ ] Honeypot field check; size limit on the body
- [ ] Rate limit per IP (Cloudflare rate limiting rule on `/api/contact`)
- [ ] Forward validated JSON to the Lambda URL, signed with `aws4fetch` (service `lambda`)

### Lambda

- [ ] Validate fields (name, email, message, type: job / freelance / other, language); length limits
- [ ] Send a plain-text email to your inbox with `Reply-To` set to the sender (no auto-reply to the sender, to avoid becoming a spam relay)
- [ ] Structured logging without storing message bodies
- [ ] Unit tests for validation and the SES call (mocked)

### Form (site)

- [ ] Works as a normal HTML form POST (progressive enhancement); small script for inline success/error states
- [ ] Labels, error messages, success state in EN and DE
- [ ] Short privacy note linking to the Datenschutz page

### Done when

A real submission from the live site arrives in your inbox, spam submissions without a valid Turnstile token are rejected at the Worker, and direct calls to the Lambda URL without a signature return `403`.

---

## Phase 7: Email and DNS

- [x] Mailbox provider (Purelymail) set up for `hello@vedad-dizdarevic.dev`, live. Records were created by hand in Cloudflare (MX, SPF, DKIM CNAMEs, ownership TXT, DMARC CNAME), so they were **imported into Terraform state** (2026-11-02) rather than recreated. Gotcha: Cloudflare returns TXT content wrapped in quotes, so TXT `content` in Terraform is written with escaped quotes (otherwise a permanent diff). The live MX priority is 50 (Purelymail's docs); the Terraform record matches it. The leftover `autoconfig` CNAME and `_autodiscover` SRV records are not in Terraform yet
- [x] Removed the leftover Namecheap forwarding SPF record; one SPF record remains (`include:_spf.purelymail.com`). Two SPF records on one name would be invalid and fail with `permerror`
- [x] DMARC replaced by hand: Purelymail's `_dmarc` CNAME removed, own TXT record `v=DMARC1; p=none; rua=mailto:hello@vedad-dizdarevic.dev` in place (verified with `dig`). Imported into Terraform with the other mail records (2026-11-02)
- [x] MX records in Cloudflare DNS via Terraform
- [ ] SPF: one record covering the mailbox provider and SES (`include:amazonses.com` for the MAIL FROM domain)
- [ ] DKIM for the mailbox provider and SES
- [ ] DMARC: start at `p=none` with `rua` reports to an address you read; move to `p=quarantine`, then `p=reject` once reports show only aligned mail (typically 2–4 weeks)
- [ ] Send test mail to Gmail and Outlook; check headers for SPF/DKIM/DMARC `pass`
- [ ] Optional: MTA-STS and TLS-RPT records

### Reading DMARC reports

DMARC is at `p=none` with `rua=mailto:hello@vedad-dizdarevic.dev` (set 2026-11-02). Receivers such as Google, Microsoft and Yahoo send **aggregate reports**: daily gzipped/zipped XML attachments that list, per sending IP, the message count and the SPF and DKIM results (pass/fail, aligned or not) for mail claiming to be from the domain. They contain no message content. Small receivers often send nothing, and a quiet domain may get no report on days without mail.

**What to check in each report:**
- Every source IP belongs to a sender you control (Purelymail now, SES after Phase 6)
- Each of those senders shows SPF **or** DKIM as `pass` **and aligned** with the From domain
- Any unknown IP that fails both is either spoofing or a forgotten service. Spoofing is the reason to enforce. A forgotten service must be fixed (or added to SPF/DKIM) before enforcing

**Decision rule for tightening the policy:**

| Move | When |
|---|---|
| `p=none` → `p=quarantine` | At least ~2 weeks of reports (target ~D13), every legitimate source aligned, and a test mail from Purelymail has passed in Gmail and Outlook headers |
| `p=quarantine` → `p=reject` | Reports since the last change show only aligned mail, **including SES** (send a test contact-form message after Phase 6 and confirm it in a later report). Target D23 |
| Stay put | A legitimate source fails alignment, or SES isn't live yet. Fix it first; don't enforce on a guess. Launch at `p=quarantine` if needed (see [roadmap.md](roadmap.md#critical-path-and-long-lead-times)) |

**Handling the XML:** the raw files are unreadable in practice. Use a DMARC report viewer to turn them into a table, and check its privacy terms first (reports list your sending IPs). Filter or label the incoming mail so it doesn't clutter the inbox.

**Test mail to generate reports:** send a few messages from `hello@` to a Gmail and an Outlook address, and check the headers for `spf=pass`, `dkim=pass` and `dmarc=pass`.

### Done when

Mail to and from the domain works, all three checks pass, and DMARC is at `p=reject`.

---

## Phase 8: SEO and social

- [ ] Per-page `<title>` and meta description in both languages
- [ ] Canonical URLs; `hreflang` for `en`, `de` and `x-default`
- [ ] `@astrojs/sitemap` with i18n config; `robots.txt` pointing to the sitemap
- [ ] JSON-LD `Person` on the home page (name, job title, sameAs: GitHub, LinkedIn); `Article` or `CreativeWork` on case study pages
- [ ] Build-time OG images (1200×630) per page and language; `og:*` and `twitter:*` tags
- [ ] Test the preview with the LinkedIn Post Inspector
- [ ] Verify the domain in Google Search Console and submit the sitemap

### Done when

Lighthouse SEO is 100, the LinkedIn preview shows the right image and text in both languages, and Search Console reports no errors.

---

## Phase 9: Hardening and quality gates

### Security headers

- [ ] Check the browser console on every page and in both themes/languages for CSP report-only violations
- [ ] Fix violations (no `'unsafe-inline'`, no new third-party origins without a reason)
- [ ] Switch to the enforcing `Content-Security-Policy` header
- [ ] securityheaders.com: A+; Mozilla Observatory: A+ or close, with any gaps explained
- [ ] SSL Labs: A+

### Quality gates in CI (fail the build)

- [ ] **Lighthouse CI** (mobile profile) on home, a case study page and the German home page: Performance ≥ 95, Accessibility 100, Best Practices 100, SEO 100; resource budgets (e.g. total JS < 20 KB on pages without a diagram, diagram pages ≤ the budget set in the Phase 4 spike, CSS < 30 KB gzipped, page weight < 500 KB excluding the CV)
- [ ] **axe** via Playwright on every page, zero violations _(started in Phase 3: `tests/e2e` covers `/`, `/de/` and the 404 page; extend it as pages are added)_
- [ ] **Playwright** layout checks at 360, 390, 768, 1280px: no horizontal scroll, header CTAs visible; screenshot artifacts attached to the PR _(started in Phase 3: the `e2e` CI job uploads the screenshots as an artifact; extend as pages are added)_
- [ ] **html-validate** and a **link checker** (internal links on PRs, external links on a weekly schedule so outside sites can't block deploys)
- [ ] **Trivy/Checkov** on Terraform (infra repo); **gitleaks** on both repos
- [ ] Dependabot (or Renovate) for npm, GitHub Actions and Terraform providers (provider updates in the infra repo)

### Legal (Germany)

- [ ] Impressum (EN + DE): name, address, contact; check § 5 DDG requirements
- [ ] Datenschutzerklärung (EN + DE): hosting (Cloudflare, AWS `eu-central-1`), contact form processing, Cloudflare Web Analytics, Turnstile, no cookies
- [ ] Both linked from the footer on every page

### Done when

All gates are required status checks on `main`, the CSP is enforced, and the legal pages are live.

---

## Phase 10: Monitoring and operations

### Monitoring

- [ ] Better Stack uptime checks (monitor on `/` already exists from Phase 0) every 5 minutes on `/` and `/de/`, plus a keyword check (catches a "200 with an error page"); alert by email
- [ ] Optional synthetic check of `/api/contact` returning the expected rejection for a request without a Turnstile token (proves the Worker → Lambda path is wired without sending mail)
- [ ] CloudWatch alarms → SNS → email: Lambda errors, Lambda throttles, SES bounce and complaint rates
- [ ] AWS Budgets: alert at €5 actual and at forecasted overspend
- [ ] Cloudflare Web Analytics enabled (a site was created by an early apply and removed from Terraform state; it still exists in Cloudflare with `auto_install`. Decide whether to manage it in Terraform once a token with the right permission is found, and check that the injected beacon is allowed by the enforced CSP)

### Operations

- [ ] **Worker key rotation:** scheduled workflow in the app repo (every 90 days), using a rotation role that the infra repo creates, that creates a new access key, updates the Worker secrets, verifies the site, then deletes the old key; alert on failure
- [ ] **Asset pruning:** remove `/_astro/` files not referenced by the current build and older than 30 days (scheduled job)
- [ ] **Rollback:** documented procedure: revert the commit and let the pipeline redeploy; S3 versioning as a fallback; `wrangler rollback` for the Worker
- [ ] **Runbook** (`documentation/runbook.md` in the app repo): deploy, rollback, rotate keys, update the CV, add a case study, respond to an alert

### Done when

Each alert has fired once in a test, and the runbook procedures have each been tried once.

---

## Phase 11: Launch

### Checklist

- [ ] All phase "done when" criteria met
- [ ] Manual test on a real iPhone (Safari) and Android phone (Chrome): both languages, both themes, contact form, CV download
- [ ] Desktop test in Chrome, Firefox, Safari
- [ ] Proofread all text, EN and German (ideally a native German speaker reviews the DE text)
- [ ] Every CTA works: Contact, CV (both languages), GitHub, LinkedIn, booking link if used
- [ ] OG preview checked on LinkedIn
- [ ] CV PDFs match the LinkedIn profile
- [ ] DMARC at `p=reject`; test email delivered
- [ ] Remove any placeholder or test content

### After launch

- [ ] Add the site URL to LinkedIn, GitHub profile, CV, and email signature
- [ ] Share a short LinkedIn post about how the site is built
- [ ] Review analytics and Search Console after two weeks

---

## Post-launch backlog

- Full German translations of the case studies
- PR preview deployments (Worker on a preview subdomain reading a per-PR S3 prefix)
- Write-ups for further projects as they're built
- Blog or notes section, if there's a steady supply of topics

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Content takes longer than code | Launch slips | Start content in Phase 0; launch with two case studies; German case study text can follow |
| SES production access delayed or denied | No contact form | Request early; fall back to a booking link or `mailto:` until approved |
| Worker IAM key leaks | Read access to public site files; contact Lambda can be invoked | Permissions limited to `GetObject` and one function URL; Lambda concurrency cap; 90-day rotation; gitleaks in CI |
| CSP breaks something after enforcement | Broken page features | Report-only phase covering every page; Playwright tests run with the enforced header before switching |
| Cached HTML references deleted assets | Broken styles after deploy | Hashed assets uploaded first and not deleted on deploy; pruned later |
| Third-party scripts slow the site | Lighthouse regressions | Only Cloudflare Analytics and Turnstile (Turnstile only on the contact section); Lighthouse budgets in CI |

## Content inputs

Things only you can provide; start these in Phase 0.

- [ ] Positioning line and hero copy (draft, I can help edit)
- [ ] For each case study: the problem, the architecture (rough sketch is fine), the stack, 2–3 decisions with the reasons and alternatives you considered, outcome numbers (cost, deploy time, uptime), repo links
- [ ] Screenshots: Grafana dashboards, pipeline runs, anything visual
- [ ] About section notes: path, goals, languages, personality line
- [ ] Freelance offer: services, typical engagements, availability
- [ ] Impressum details: legal name, address, contact email
- [ ] Optional: a photo
- [ ] Links: GitHub, LinkedIn, booking tool (if any)
