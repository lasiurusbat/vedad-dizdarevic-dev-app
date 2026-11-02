# Tech Stack | vedad-dizdarevic.dev

Companion to [project-scope.md](project-scope.md). Goals: fast, accessible, cheap, GDPR-friendly, and itself evidence of DevOps work.

## Overview

```
Browser ──HTTPS──▶ Cloudflare (DNS, CDN, TLS, Worker) ──HTTPS + SigV4──▶ S3 (eu-central-1, private)
                              │
                              └── /api/contact ──▶ Lambda (eu-central-1) ──▶ SES (eu-central-1)
```

- **Edge:** Cloudflare (free plan)
- **Origin and backend:** AWS `eu-central-1`
- **Infrastructure as code:** Terraform (AWS + Cloudflare providers)
- **CI/CD:** GitHub Actions with OIDC (or GitLab CI with OIDC, to match the flagship projects)

## Site

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Astro** (static output) | Zero JS by default; content collections for case studies (MDX + typed schema) |
| i18n | Astro i18n routing | `/` (EN) and `/de/` (DE), `hreflang` tags |
| Styling | **Tailwind CSS v4** via `@tailwindcss/vite` | CSS-first config (`@theme` in `global.css`, no `tailwind.config.js`); see [Styling](#styling) |
| Fonts | Self-hosted (Fontsource) | No Google Fonts CDN (GDPR) |
| Diagrams | **React Flow** (`@xyflow/react`) + AWS Architecture Icons | Interactive React island (`@astrojs/react`), loaded only on pages with a diagram; nodes/edges defined as typed data in `site/src/diagrams/`; see [Diagrams](#diagrams) |
| Images | Astro `<Image>` | AVIF/WebP, responsive sizes |
| Social preview | Build-time OG images (`astro-og-canvas` / Satori) | One per page and language |
| SEO | `@astrojs/sitemap`, JSON-LD `Person`, canonical + `hreflang` | |
| CV | **Typst** source compiled in CI | EN + DE from one template and shared data; see [CV](#cv) |

Astro config: `build.inlineStylesheets: 'never'` so the CSP needs no `'unsafe-inline'`.

## Styling

- **Tailwind CSS v4**, added with `@tailwindcss/vite` in `astro.config.mjs` and `@import "tailwindcss";` in `src/styles/global.css`
- **Design tokens in `@theme`:** brand colours, font families, fluid type and spacing (`clamp()` values), so utilities like `text-fluid-lg` exist
- **Semantic colour tokens** (`--color-bg`, `--color-fg`, `--color-muted`, `--color-accent`, `--color-border`) that switch values under `@media (prefers-color-scheme: dark)`; components use `bg-bg text-fg` instead of repeating `dark:` on every element. Tailwind's `dark:` variant also follows `prefers-color-scheme` by default, for one-off cases
- **`@tailwindcss/typography`** (`@plugin` in CSS) for case study prose rendered from MDX, themed with the same tokens
- **Container queries** are built into v4 (`@container`, `@md:`), used for cards and the diagram component
- **`prettier-plugin-tailwindcss`** for consistent class order
- Tailwind generates one static CSS file with only the classes used, so the CSP stays `style-src 'self'`; no CSS-in-JS and no runtime

## Diagrams

Decision: React Flow with the AWS Architecture Icons, chosen over build-time D2/Mermaid SVG for interactivity (pan, zoom, hover details) and a consistent look with the icon set recruiters recognise.

- **Island, not site-wide JS:** `@astrojs/react` is used only for the diagram component, hydrated with `client:visible` (or `client:only="react"`) so pages without a diagram ship no React
- **JS budget:** pages without a diagram keep the < 20 KB budget; case study and "How this site is built" pages get a separate, higher budget (starting point ≤ 150 KB gzipped, to be measured in a spike)
- **CSP risk:** server-rendered React Flow output contains inline `style="…"` attributes, which `style-src 'self'` blocks. Prefer `client:only="react"` (styles are then set through the DOM, which the CSP allows) and verify under the report-only header before enforcing. Do not add `'unsafe-inline'`
- **No-JS / loading fallback:** each diagram has a text alternative and a pre-rendered static image (exported from the same data) shown in `<noscript>` and before hydration
- **Icons:** AWS Architecture Icons downloaded from AWS and kept as local SVGs in `site/src/diagrams/icons/` (self-hosted; check the AWS icon usage guidelines before launch). Cloudflare and other non-AWS nodes use simple custom icons
- **Theming:** node and edge colours use the semantic tokens so diagrams follow light/dark mode
- **Accessibility:** keyboard-focusable controls, a visible focus state, `aria-label` on the canvas, and the text alternative next to every diagram

## Mobile

Recruiters often open the link on a phone, so the layout is designed for small screens first.

- **Mobile-first CSS:** Tailwind is mobile-first by design: unprefixed utilities target ~360px, `sm:`/`md:`/`lg:` and container-query variants add layout for larger screens
- **Fluid sizing:** `clamp()`-based type and spacing tokens in `@theme` instead of many breakpoints; body text ≥16px (also prevents iOS zoom on form inputs)
- **Always-reachable CTAs:** compact sticky header (or bottom bar on mobile) with Contact, CV, GitHub, LinkedIn
- **Touch targets** ≥44×44px; no hover-only interactions
- **Diagrams:** React Flow canvas that fits the view on load; complex diagrams get a simplified mobile layout; pan/zoom must not trap page scroll on touch (see [Diagrams](#diagrams))
- **Overflow:** tables and code blocks scroll inside their own container, never the page
- **Images:** responsive `srcset`/`sizes` via Astro `<Image>`, lazy-loaded below the fold
- **Details:** `viewport` meta tag, `env(safe-area-inset-*)` for notched phones, `prefers-reduced-motion` respected
- **Testing:** Lighthouse CI uses the mobile profile (throttled CPU and network); Playwright screenshots at 360, 390, 768 and 1280px; manual check on a real iPhone and Android device before launch

## CV

- Source in `cv/`: one Typst template plus a structured data file (YAML/TOML) holding the content, with EN and DE text side by side
- Compiled in CI with the Typst CLI (`typst compile`, fonts pinned via `--font-path` in the repo) into `Vedad_Dizdarevic_CV_EN.pdf` and `Vedad_Dizdarevic_CV_DE.pdf`, copied into the site build
- The existing PDFs (`*_1026.pdf`) are the reference for the initial port and are removed once the Typst output matches
- Optional: the site's skills and experience sections read the same data file, so the site and CV can't drift apart
- LinkedIn is still updated by hand

## Hosting and edge

| Concern | Choice |
|---|---|
| DNS | Cloudflare DNS |
| CDN / TLS | Cloudflare proxy, SSL mode **Full (strict)** |
| Origin | Private S3 bucket in `eu-central-1` (Block Public Access on) |
| Origin access | **Cloudflare Worker** signs requests (SigV4) to the S3 REST endpoint over HTTPS with a read-only IAM user scoped to the bucket |
| Rewrites | Worker: `/path/` → `/path/index.html`, custom 404 page |
| Redirects | Cloudflare Redirect Rule: `www` → apex |
| Security headers | Set in the Worker only (see below) |
| Contact form | Worker routes `/api/contact` → Lambda (`eu-central-1`) → SES; Cloudflare Turnstile + honeypot |
| Analytics | Cloudflare Web Analytics (cookieless, no consent banner) |

### Cloudflare Worker

Decision: a Worker in front of a private S3 bucket, chosen over a public S3 website endpoint (plain HTTP to origin, public bucket) and over CloudFront + OAC (keeps the CDN on AWS). It keeps the bucket private, uses HTTPS end to end, and puts edge logic in version-controlled code.

Responsibilities:
1. Sign requests (SigV4) to the S3 REST endpoint and stream the response
2. Map clean URLs to `index.html`; serve the custom 404 page
3. Add the security headers to every response
4. Forward `/api/contact` to the Lambda

Implementation: TypeScript, `aws4fetch` for signing, Wrangler for local dev and deploy, unit tests with Vitest (`@cloudflare/vitest-pool-workers`).

Credentials: a dedicated IAM user with `s3:GetObject` on the site bucket and `lambda:InvokeFunctionUrl` on the contact function (function URL uses `AWS_IAM` auth), nothing else; its keys stored as Worker secrets. This is the one long-lived key in the setup; rotate it on a schedule (e.g. every 90 days, scripted in CI).

## Security headers

Set in one place, the Worker, and asserted in CI. Nothing is duplicated in the Cloudflare dashboard.

| Header | Value |
|---|---|
| Content-Security-Policy | `default-src 'none'; script-src 'self' https://static.cloudflareinsights.com https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://cloudflareinsights.com; frame-src https://challenges.cloudflare.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; manifest-src 'self'; upgrade-insecure-requests` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` (`.dev` is HSTS-preloaded at the TLD anyway) |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |

Rollout: ship the CSP as `Content-Security-Policy-Report-Only` first, then enforce. Target: A+ on securityheaders.com and Mozilla Observatory.

## Email

- Mailbox provider (Purelymail) for `hello@vedad-dizdarevic.dev`
- SES (`eu-central-1`) for contact-form notifications, moved out of the SES sandbox
- SPF, DKIM (mailbox provider + SES), and DMARC `p=reject`, all as Terraform-managed Cloudflare DNS records

## Infrastructure as code

- **Terraform** with `hashicorp/aws` and `cloudflare/cloudflare` providers, in a separate `infra` repo (sibling of the app repo) with its own CI
- State: S3 backend in `eu-central-1` with native locking (`use_lockfile = true`), so no DynamoDB table
- Manages: S3 bucket and policy, IAM (Worker reader, CI deployer via OIDC, Lambda role), Lambda, SES identity, Cloudflare zone settings, DNS records, redirect rules, Turnstile widget, AWS Budget
- The Worker script and its route are deployed with Wrangler (`wrangler.toml` in the app repo), not Terraform, so the two tools never manage the same resource

## CI/CD pipeline

Two repos, two pipelines. **App repo** (site, Worker, Lambda, CV):

On pull request:
1. Typst compile of both CVs, then `astro check` + build
2. html-validate, link checker
3. Lighthouse CI, mobile profile, with budgets (fails build below thresholds)
4. axe accessibility checks and Playwright screenshots at mobile, tablet and desktop widths
5. gitleaks

On merge to `main`:
1. `aws s3 sync` of the build output (hashed `/_astro/` assets first, then the rest)
2. Worker deploy
3. Cloudflare cache purge via API
4. Smoke test: curl the live site and assert status codes and all six security headers

**Infra repo** (Terraform):

On pull request: `terraform fmt -check`, `validate`, Trivy/Checkov IaC scan, gitleaks, then `terraform plan` posted as a PR comment.

On merge to `main`: `terraform apply`.

Auth: OIDC to AWS in both repos with separate roles (the app deploy role can only write to the site bucket; the infra roles cover Terraform state and resources). Each repo has its own scoped Cloudflare API token stored as a CI secret. Non-secret values the app needs from Terraform (bucket name, role ARN, zone ID) are copied into app repo Actions variables.

## Monitoring

- Uptime: Better Stack (free tier)
- CloudWatch alarms on Lambda errors and SES bounces/complaints → SNS → email
- AWS Budgets alert at ~$5/month
- Cloudflare Web Analytics for traffic

## Compliance (Germany)

- Impressum and Datenschutzerklärung pages in EN and DE, linked from the footer
- GDPR-friendly choices documented on the site: EU region, self-hosted fonts, cookieless analytics

## Cost estimate

| Item | Monthly |
|---|---|
| Domain | ~€1 (annual fee amortised) |
| Cloudflare (DNS, CDN, Worker, Turnstile, Analytics) | €0 (free plan) |
| S3, Lambda, SES at portfolio traffic | <€1 |
| Mailbox provider (Purelymail, ~$10/year minimum) | ~€1 |
| **Total** | **~€3–4** |
