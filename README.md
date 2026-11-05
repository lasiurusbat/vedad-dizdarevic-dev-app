# vedad-dizdarevic.dev

Source for the personal portfolio site of Vedad Dizdarevic, Cloud & DevOps Engineer, live at <https://vedad-dizdarevic.dev>.

The site is itself a portfolio project: a static, bilingual (EN/DE) site with infrastructure as code, CI/CD and monitoring. This repo holds the application. Terraform lives in the sibling **infra** repo.

> **Status:** the site is live. Phases 1–3 are done (tooling, infrastructure, design system and layout) and Phase 4 (content) is in progress: hero, case study pages (Sorted in English), certifications. Remaining work is in the [implementation plan](documentation/implementation-plan.md) and [next steps](documentation/next-steps.md).

## Architecture

```
Browser → Cloudflare (DNS, CDN, TLS, Worker) → private S3 bucket (eu-central-1, SigV4)
                              └─ /api/contact → Worker → Lambda function URL (AWS_IAM) → SES
```

- Static pages are built with Astro and Tailwind CSS v4 and served from a private S3 bucket through a Cloudflare Worker.
- The Worker sets all security headers and signs requests to S3.
- The contact form is protected by Turnstile and delivered by a Lambda function through SES.
- EU region, self-hosted fonts and cookieless analytics keep it GDPR-friendly.

## Repository layout

| Path                 | Contents                                                                       |
| -------------------- | ------------------------------------------------------------------------------ |
| `site/`              | Astro project (pages, components, case study MDX, EN/DE strings)               |
| `worker/`            | Cloudflare Worker (routing, caching, security headers), deployed with Wrangler |
| `lambda/contact/`    | Contact form handler                                                           |
| `case-studies/`      | Source notes and raw screenshots, one `cs_<project>/` folder per case study    |
| `cv/`                | Typst template and data for the EN and DE CV PDFs                              |
| `tests/`             | `e2e/` Playwright checks, `smoke/` post-deploy checks                          |
| `documentation/`     | Scope, tech stack, implementation plan, roadmap                                |
| `.github/workflows/` | CI/CD for the site and Worker                                                  |

Terraform (`bootstrap/` and `main/`) is in the separate `infra` repo, which manages AWS and the Cloudflare zone, DNS and rules. Wrangler alone deploys the Worker script and route.

## Local development

Requirements: Node.js LTS (see `.nvmrc`), pnpm, Typst for the CV. Diagrams are React Flow components inside `site/`, so there is no extra tool to install.

```sh
pnpm install          # install tooling (Node version in .nvmrc)
pnpm lint             # ESLint
pnpm format:check     # Prettier (use `pnpm format` to fix)
pre-commit install    # optional: hooks for whitespace, Prettier, gitleaks
```

```sh
pnpm --filter @vdd/site dev        # http://localhost:4321/ (draft case studies are shown in dev)
pnpm --filter @vdd/site check      # astro check (types)
pnpm --filter @vdd/site build
pnpm --filter @vdd/worker test     # Worker tests (Vitest in the Workers runtime)
pnpm --filter @vdd/e2e test        # Playwright + axe against a fresh build
                                   # first run: pnpm --filter @vdd/e2e exec playwright install chromium
```

## Deployment

On merge to `main`, GitHub Actions:

1. builds the site
2. uploads `/_astro/` hashed assets to S3 first, without `--delete`, then the rest with `--delete`
3. runs `wrangler deploy`
4. purges the Cloudflare cache
5. runs the smoke test against the live site

CI authenticates to AWS through OIDC, with no long-lived AWS keys. The bucket, deploy role and Cloudflare zone settings are created by the infra repo's pipeline.

## Quality gates

ESLint, Prettier, gitleaks, the Worker tests, the site build and the Playwright + axe sweep (`e2e`) run in CI and fail the build when they regress. Lighthouse budgets and html-validate arrive in Phase 9.

## Documentation

- [Project scope](documentation/project-scope.md): what the site is for and who it is for
- [Tech stack](documentation/tech-stack.md): technology choices, security headers, cost
- [Implementation plan](documentation/implementation-plan.md): phases and tasks
- [Roadmap](documentation/roadmap.md): milestones and schedule
- [Next steps](documentation/next-steps.md): where the last session stopped
