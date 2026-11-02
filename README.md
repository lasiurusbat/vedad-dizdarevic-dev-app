# vedad-dizdarevic.dev

Source for the personal portfolio site of Vedad Dizdarevic, Cloud & DevOps Engineer, live at <https://vedad-dizdarevic.dev>.

The site is itself a portfolio project: a static, bilingual (EN/DE) site with infrastructure as code, CI/CD and monitoring. This repo holds the application. Terraform lives in the sibling **infra** repo.

> **Status:** planning is done and implementation has not started. Commands and structure below describe the target state from the [implementation plan](documentation/implementation-plan.md).

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

| Path | Contents |
|---|---|
| `site/` | Astro project (pages, components, content, EN/DE strings) |
| `worker/` | Cloudflare Worker (routing, caching, security headers), deployed with Wrangler |
| `lambda/contact/` | Contact form handler |
| `case-studies/` | Source notes for the case studies (RainAlert, Sorted) |
| `cv/` | Typst template and data for the EN and DE CV PDFs |
| `diagrams/` | D2 sources, rendered to SVG at build time |
| `tests/` | `e2e/` Playwright checks, `smoke/` post-deploy checks |
| `documentation/` | Scope, tech stack, implementation plan, roadmap |
| `.github/workflows/` | CI/CD for the site and Worker |

Terraform (`bootstrap/` and `main/`) is in the separate `infra` repo, which manages AWS and the Cloudflare zone, DNS and rules. Wrangler alone deploys the Worker script and route.

## Local development

Requirements: Node.js LTS (see `.nvmrc`), pnpm, Typst for the CV, D2 for diagrams.

Build, test and deploy commands will be listed here once Phases 1–2 add them.

## Deployment

On merge to `main`, GitHub Actions:

1. builds the site
2. uploads `/_astro/` hashed assets to S3 first, without `--delete`, then the rest with `--delete`
3. runs `wrangler deploy`
4. purges the Cloudflare cache
5. runs the smoke test against the live site

CI authenticates to AWS through OIDC, with no long-lived AWS keys. No infrastructure exists yet. The bucket, deploy role and Cloudflare zone settings are created by the infra repo's pipeline (Phases 1–2), and this deploy workflow is added only after that first apply.

## Quality gates

Lighthouse (mobile), axe, Playwright, html-validate and gitleaks run in CI and fail the build when they regress.

## Documentation

- [Project scope](documentation/project-scope.md): what the site is for and who it is for
- [Tech stack](documentation/tech-stack.md): technology choices, security headers, cost
- [Implementation plan](documentation/implementation-plan.md): phases and tasks
- [Roadmap](documentation/roadmap.md): milestones and schedule
