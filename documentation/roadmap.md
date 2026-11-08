# Roadmap | vedad-dizdarevic.dev

The timeline view of [implementation-plan.md](implementation-plan.md): milestones, the order of work, and which items take the longest. Scope comes from [project-scope.md](project-scope.md) and technology from [tech-stack.md](tech-stack.md). Task-level detail stays in the implementation plan. This file only sequences it.

## Assumptions

- **Pace:** full-time, 8–10 hours a day, 5 days a week. **D1** is the first working day; Week 1 is D1–D5, Week 2 is D6–D10, and so on.
- **Effort:** about 23 working days of work (~200 hours), including writing the content.
- **Target:** launch on **D23** (Week 5), with D24–D25 as buffer.
- **One person:** "parallel" means work fits around waiting time (DNS propagation, SES review, DMARC reports), not two things built at once.
- **Rule:** every milestone ships through the real pipeline to the live domain. Nothing waits for a "big bang" release.

## Milestones

| # | Milestone | Phases | Target | Exit criteria | Status |
|---|---|---|---|---|---|
| M1 | **Foundation** | 0, 1 | End of D3 (W1); done 2026-11-02 | Accounts with MFA, decisions closed, app and infra repos with protected `main`, `terraform plan` running in the infra repo's CI through OIDC | Done |
| M2 | **Live skeleton** | 2 | End of D6 (W2) | Placeholder served at `https://vedad-dizdarevic.dev` via Cloudflare → Worker → private S3, deployed on merge, smoke test green, CSP in report-only | Done 2026-11-03 (infra pipeline gaps still open) |
| M3 | **Content complete** | 3, 4, 5 | End of D16 (W4) | All sections live in EN; hero / work with me / contact in DE; two case studies with diagrams; EN + DE CV PDFs built from Typst | In progress (three case studies in EN and DE with diagrams: Sorted, Rain Alert, and "How this site is built" as the `this-site` case study (2026-11-07); Skills groups and About languages done; Work with me and the CV done) |
| M4 | **Feature complete** | 6, 7, 8 | End of D19 (W4) | Contact form delivers real mail; SPF/DKIM/DMARC passing; sitemap, `hreflang`, JSON-LD, OG images | Not started |
| M5 | **Launch-ready** | 9, 10 | End of D22 (W5) | CSP enforced; Lighthouse / axe / Playwright gates required on `main`; legal pages live; alerts tested; runbook written | Not started |
| M6 | **Launch** | 11 | D23 (W5) | Launch checklist complete, DMARC at `p=reject`, link on LinkedIn / GitHub / CV | Not started |

## Schedule

| Days | Phase | Effort | Notes |
|---|---|---|---|
| D1 | P0 Prerequisites | 1 d | Accounts, MFA, decisions, nameserver switch, **SES production access request**; collect case study notes and screenshots |
| D2–D3 | P1 Repositories and bootstrap | 2 d | App and infra repos, tooling, `infra/bootstrap`, OIDC, first CI workflow |
| D3 | P7 Email and DNS (setup) | ½ d | Mailbox, MX, SPF, DKIM, DMARC `p=none` in Terraform, so DMARC reports start arriving |
| D4–D6 | P2 Walking skeleton | 3 d | S3, Worker v1 with tests, pipeline v1, smoke test; first Lighthouse / axe / header checks in CI |
| D7–D9 | P3 Design system and layout | 3 d | Tokens, fonts, header CTAs, dark mode, EN/DE routing, components |
| D10–D14 | P4 Content sections | 5 d | Writing and building: hero, two case studies with React Flow diagrams (incl. a ½ d spike), skills, about, work with me, how this site is built |
| D13 | P7 Email and DNS | — | DMARC to `p=quarantine` if reports show only aligned mail |
| D15–D16 | P5 CV from Typst | 2 d | `data.yaml`, template, CI compile, site links |
| D17–D18 | P6 Contact form | 2 d | Lambda, SES identity, Turnstile, Worker `/api/contact`, form |
| D19 | P8 SEO and social | 1 d | Meta, `hreflang`, sitemap, JSON-LD, OG images, Search Console |
| D20–D21 | P9 Hardening and quality gates | 2 d | Fix CSP report-only violations, enforce CSP, tighten budgets, legal pages, Dependabot |
| D22 | P10 Monitoring and operations | 1 d | Uptime, alarms, budget, key rotation workflow, runbook |
| D23 | P11 Launch | 1 d | Real-device tests, proofreading fixes, DMARC to `p=reject`, share the link |
| D24–D25 | Buffer | 2 d | Absorbs slips; otherwise start on post-launch items |

## Timeline by week

`■` = active work, `·` = waiting or running in the background.

| Workstream | W1 (D1–5) | W2 (D6–10) | W3 (D11–15) | W4 (D16–20) | W5 (D21–25) |
|---|---|---|---|---|---|
| Accounts and decisions (P0) | ■ | | | | |
| Repo, tooling, bootstrap (P1) | ■ | | | | |
| Walking skeleton (P2) | ■ | ■ | | | |
| Design system and layout (P3) | | ■ | | | |
| Content sections (P4) | | ■ | ■ | | |
| CV from Typst (P5) | | | ■ | ■ | |
| Contact form (P6) | | | | ■ | |
| Email and DNS (P7) | ■ | · | ■ | · | ■ |
| SEO and social (P8) | | | | ■ | |
| Hardening and quality gates (P9) | | ■ | | ■ | ■ |
| Monitoring and operations (P10) | | | | | ■ |
| Launch (P11) | | | | | ■ |
| SES production access | ■ | · | | | |
| German proofreading | | ■ | · | · | ■ |

Notes on the timeline:

- **P9 starts in Week 2.** Lighthouse, axe and header checks join CI with the skeleton ([Approach §2](implementation-plan.md#approach)), so D20–D21 are about tightening budgets and enforcing the CSP, not adding gates late.
- **P7 starts on D3 on purpose.** At full-time pace the DMARC ramp, not the code, sets the launch date. `p=none` on D3, `p=quarantine` around D13, `p=reject` on D23 gives four calendar weeks of reports.
- **P4 is the riskiest block.** Five days assumes the case study notes collected on D1 are mostly complete. If writing runs long, P5 can move after P6 since nothing else depends on it.

## Critical path and long lead times

At full-time pace, waiting time matters more than effort. Start these early or they will hold up launch.

| Item | Why it's long | Start | Needed by | Fallback |
|---|---|---|---|---|
| DMARC ramp to `p=reject` | Needs weeks of aggregate reports showing only aligned mail | D3 | D23 (launch) | Launch at `p=quarantine`, move to `p=reject` within a week or two |
| Case study content (problem, decisions, outcome numbers, screenshots) | Writing and gathering evidence take longer than the code | D1 | D14 (P4) | Launch with two case studies; DE case study text after launch |
| ~~SES production access~~ | Granted in Phase 0 | D1 | D17 (P6) | None needed |
| Nameserver switch to Cloudflare | Registrar propagation, can take up to 48 h | D1 | D4 (P2) | None; do it first |
| CSP report-only period | Must cover every page, theme and language before enforcing | D4 | D21 (P9) | Keep report-only past launch if violations remain |
| German proofreading | Depends on someone else's availability | Ask on D8 | D22 | Launch with DE hero / contact / services only |

## Launch scope

**Must have at launch** (from the scope's must-have list):

- Hero with positioning and availability line, EN + DE
- Two case studies (sorted.onl, rainalert.live) with diagram, stack, decisions, links
- Grouped skills with the DevOps diploma, About, Work with me
- Contact / CV / GitHub / LinkedIn reachable from every screen
- EN + DE CV PDFs
- Working contact form, or a `mailto:` / booking link fallback
- "How this site is built" section
- HTTPS, all six security headers with CSP enforced, legal pages (Impressum, Datenschutz)
- Green Lighthouse on mobile, dark/light mode, OG preview

**Can slip past launch without hurting it:**

- Third case study (this site; the "How this site is built" section already covers it)
- Full German translations of the case studies
- `cv/data.yaml` feeding the site's skills section
- MTA-STS / TLS-RPT
- Synthetic `/api/contact` check
- Scheduled `/_astro/` asset pruning (old hashed assets are harmless for a while)

## After launch

| Horizon | Items |
|---|---|
| **Week 6** | Review analytics and Search Console; DMARC to `p=reject` if not yet there; first key rotation run tested end to end; fix anything from launch feedback |
| **Next (Weeks 7–10)** | Full German case studies; third case study; site skills sourced from `cv/data.yaml`; PR preview deployments |
| **Later** | Write-ups for new projects as they're built; blog or notes section if there's a steady supply of topics |

## Keeping this roadmap current

- Update the **Status** column in [Milestones](#milestones) when a milestone's exit criteria are met (`Not started` → `In progress` → `Done`), and the status in [CLAUDE.md](../CLAUDE.md) with it.
- Once work starts, replace the `D`-numbers in the milestone table with real dates.
- If a milestone slips by more than a day or two, move the later targets and note the reason here rather than squeezing later phases.
- New ideas go to the post-launch table, not into the current milestone.
