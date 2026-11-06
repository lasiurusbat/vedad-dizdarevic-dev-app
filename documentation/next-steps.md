# Next steps

Working log for picking up where the last session stopped. Task-level detail stays in [implementation-plan.md](implementation-plan.md), the schedule in [roadmap.md](roadmap.md). Overwrite this file at the end of each session.

## Stopped at: 2026-11-06 (day 5, afternoon)

**Everything is merged** (#30–#40; no open PRs).

### Afternoon: Sorted page review and the restructure plan

A design review of the live Sorted page (1440 px and 390 px, both themes) found: the strongest evidence comes late (about 1,100 px of text on desktop, 2,000 px on a phone, before the first diagram; stats and cost table before the reader knows the system); the same claims repeat three or four times ("three flags away", "no long-lived keys", the perimeter, stack chips vs Tech stack); the Decisions list is cut off from its evidence and mixes gain and price in one "Why"; the desktop layout leaves the right 40% empty beside a 70ch column; too many sections look alike (bold-lead bullet lists, the same faded card everywhere).

**PR 1 done (#40):** prose backticks gone; cost table item column fixed (the number columns were 4 × 24%; now 16% each, items at least 8rem from 40rem up, phones still fit all four columns); diagrams take an optional `focusNode` so a phone opens centred on it (Sorted production centres on Cloudflare, i.e. the request path); problem log without 01–05 numbers; dashboard map group labels in sentence case, meta line without middle dots; no stack chips under case-study titles.

**Agreed plan for the next PRs (one each, branch from `main`):**

- **PR 2, hero and order: done (this PR).** New frontmatter `status`, `facts` (label/value, at most 32 characters each) and `outcomesNote`. `CaseStudySummary` now renders, in order: the fact sheet (a status line with the live dot, `status` text and the `liveLinks` domain as the link; then one row of short facts, label above value, plus a Source code cell from `repoUrl`/`repoPrivate`; one line from 48rem, two columns on phones), the outcome stats (h2 "Outcome" is screen-reader only) with the honesty note, then Problem and Decisions. The pill badge is gone, and so is an Environments fact (the summary already says it); `liveLinks[].label` is no longer shown. The links row and the Scope section are gone (EN and DE). The fact sheet sits **under** the summary, not beside the title: the right side of the header now holds the illustration (#42). The cost card is no longer in the summary; the page passes `costs` to `<Content />` and the MDX places `<CostComparison costs={props.costs} />` (for now at the end of Availability and scaling; PR 3 moves it to the cost decision). `sorted.spec.ts` checks the source row and the order facts → stats → problem.
- **PR 3, sections by decision: done (#48).** The Decisions list and the `decisions` frontmatter are gone (schema, summary, i18n `caseDecisions`/`caseWhy`). Each decision is an MDX section opened by `<TradeOff gained price />` (`role="note"`, labelled "Trade-off"). **Redesigned in #51 as a ledger** directly under the heading, across the text column: Gained (accent top edge, faint accent tint, filled + sign) beside Price (neutral edge, outlined − sign), both at body size in the main text colour; side by side from 40rem, stacked on phones. The earlier right-column float was dropped: it was overlooked on desktop and cramped below 80rem. New order: Architecture; One module, every environment (scaling path); A perimeter by construction (edge, network, data, attachments); Keyless delivery (release diagram); Cost per environment (cost card, ARM64 moved here); Monitoring; Problems I hit; The workload (gallery); Tech stack; Limitations. Duplicates cut: the Compute bullet (in the architecture path and the cost section), the trade-off sentence in the deploy-role limitation. EN and DE together; the `example` drafts got a decision section. `sorted.spec.ts` checks four notes at 390 and 1440 px (beside the text on desktop, inside the column on phones).
- **PR 4, diagram path buttons: done (#49).** `DiagramDefinition.paths` (id, EN/DE label and one-sentence summary, nodes, edges, optional `focus`); `sorted-production` has Requests, Mail and Releases. `ArchitectureDiagram.astro` renders a segmented button row (`role="group"` "Trace a path", `aria-pressed`, "Everything" clears) above the canvas, `hidden` until `FlowDiagram` mounts and wires it, plus a polite live region with the path summary. A chosen path sets `vdd-on` / `vdd-dim` classes on React Flow nodes and edges (classes only, CSP-safe); lit edges get the accent, an accent arrowhead and a slow dash in the arrow's direction (still with reduced motion); on phones the sideways scroll recentres on the path's `focus`. The two arrow-chain bullets in Architecture are gone (their facts moved into the summaries). Test in `diagram.spec.ts` under the enforced CSP, with axe.
- **PR 5, ending: done (#50).** `Limitations.astro`: a two-column table (gap with an optional line of context | next step), hairline rows and no card; phones stack each row and label the next step from `data-label`. The case-study CTA is now a full-width closing band outside the article column (`CaseStudyLayout`): faded hairline and bloom like the home sections, the question at display size, "Get in touch" plus a secondary "See more work" (`caseCtaMore`, to `#work`); side by side from 64rem. Add the link to the next case study here once RainAlert exists. **The Sorted restructure (PRs 1–5) is complete.**
- Rejected: a sticky table of contents in the right column (full-width diagrams would pass under it).

The German Sorted version (#43) merged before PRs 2–3, so each restructure PR changes `de/sorted.mdx` alongside `en/sorted.mdx`.

### Morning (#30–#37): the Sorted page and the look


- **Costs from the AWS bill (#30).** The cost card shows dev and prod as billed (Cost Explorer, usage before credits, Oct 13 to Nov 4, projected to 730 h, split per environment by resource; `vdd-` charges left out) next to the doc estimates: dev before ~$105, **dev billed ~$38**, prod billed ~$96, prod at go-live ~$150. Credits currently pay the whole bill. Today's prod is still the pre-launch setup (Fargate Spot, one NAT gateway, single-AZ RDS); the page's decisions describe the go-live setup.
- **Release path diagram (#31):** second React Flow diagram (`sorted-release`, compact canvas), v1.0.0 in nodes and text.
- **Tech stack (#31):** `TechStack.astro`, a layered stack with a rail (Edge, Cloud, IaC, CI/CD, Observability; the workload below a dashed break).
- **Availability and scaling (#33):** `ScalingPath.astro`, three stages: running today, three Terraform settings away (Multi-AZ), designed but not built (scale out). The summary says "Multi-AZ is three settings away".
- **Monitoring (#32, recovered in #36):** CloudWatch and Grafana section with `DashboardMap.astro`, the prod dashboard's 14 panels by layer, no values on purpose. Two fixes for the owner in Grafana: the RDS free storage panel uses unit `bits` (should be bytes); the CPU credits panel is tagged `prometheus` but queries CloudWatch.
- **Production diagram (#37):** VPC with public subnets (ALB) and private subnets (task, RDS, standby); regional services outside the VPC. Phone canvas 68rem.
- **Look (#34, #35/#36):** lit-from-above buttons with a mild accent glow; DM Sans 500 headings (stand-in for the commercial AeonikPro of the owner's type reference), Inter body at 15–16px (`--text-body`) with `ss01`, `cv10`, no `calt`/`liga`. Hero ratios re-measured (12.3cqi, 0.674em EN, 0.63em DE).
- **Lesson:** stacked PRs (#32 on #31, #35 on #34) were merged into dead base branches and never reached `main`; recovered in #36. Rule in CLAUDE.md: branch from `main`, target `main`.
- **Local only, never commit:** `case-studies/Sorted-architecture.md` and `.claude/` (skills `copywriting`, `frontend-design`); both are in `.git/info/exclude`. The Grafana placeholder PNG is deleted.

## Next (in this order)

1. ~~Sorted page restructure~~ done (#40, #46, #48, #49, #50).
2. **Sorted German version** (after PRs 2–3) (`de/sorted.mdx`): German texts for the gallery, the `costs` block, the problem log, `ScalingPath`, `TechStack`, `DashboardMap` and the release diagram captions (diagram text alternatives already exist in DE). Then delete the draft `example` entries and move the e2e tests (`case-studies.spec.ts`, `diagram.spec.ts`) to Sorted.
3. **Tests for the new pieces:** gallery prev/next and edge fades, the random hero variant (exactly one visible), reduced motion; light coverage for `TechStack`, `ScalingPath`, `DashboardMap` (render, no axe violations already covered by the page sweep).
4. **RainAlert case study** (EN, then DE), DevOps-first like Sorted; reuse `costs`, `ProblemLog`, `TechStack` where the notes support them. The puddle image is AI-generated; say so in the caption.
5. Rest of Phase 4: Skills groups, Work with me, How this site is built; About still lacks languages; About could link "Sorted" to its case study. Optional: on tablets, narrow the hero sentence to the headline's width.
6. **Check the icon and logo usage terms** (AWS icons, GitHub Invertocat, Cloudflare logo, all unmodified; decide whether an attribution line is needed). Add a static fallback image for the Sorted diagrams in the no-JS case. Phase 0 inputs still open: Impressum details (needed by D20).
7. **Owner:** add `e2e` to the required checks on `main`; fix the two Grafana panels noted above.
8. Header CV link comes with Phase 5; footer links to How-this-site-is-built, Impressum and Datenschutz when those pages exist.
9. **When the AWS exam is passed:** download the badge from Credly, add it to `site/src/assets/credentials/`, set `badge`, `status: 'earned'`, `issued` and the Credly URL in `credentials.ts`.
10. **Live check** of the geo redirect through a German VPN.
11. **Remind the owner at the start of Phase 10** about the Cloudflare Web Analytics site (see loose ends). Phase 9: set the page-weight budget (diagram-page JS budget proposed at 140 KB gzipped; the Sorted page now loads two diagrams, which share one React Flow bundle).
12. **Refresh the billed costs** when November is complete (same method; footnote dates change).

## Key rotation

- The `vdd-worker` access key (ends in `...OI3S`) was created on **2026-11-03** and set as Worker secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
- **Rotate by 2027-02-01** (90 days): create a second key in IAM, `wrangler secret put` both values, check the smoke test, then delete the old key. IAM allows two keys per user, so this needs no downtime.

## Small loose ends

- **REMIND THE OWNER at the start of Phase 10:** the Cloudflare Web Analytics site created by an early apply still exists (`auto_install`) but is not in Terraform state (the API token gets 403). Check whether it injects a beacon (the CSP and GDPR rules matter), then decide: keep it, manage it by hand, or delete it. The owner asked to be reminded when we reach Phase 10.
- The Sorted page states costs as estimates and says failover and backup restores are designed but not drilled. Update only when the owner confirms a drill happened. The owner approved publishing that the deploy role is an administrator (2026-11-04).
- Local-only files: `.claude/` and `case-studies/Sorted-architecture.md` stay out of git (listed in `.git/info/exclude`, owner's decision 2026-11-06).
- A preview server may still be running on port 4199 (`tests/e2e/serve.mjs` serving `site/dist`): `pkill -f "serve[.]mjs"`.
- Old local branches whose PRs are merged can be deleted (`git branch --merged origin/main`); `feat/sorted-diagram` has one local commit that duplicates #27 and can go too.
- e2e runs rebuild `site/dist` with `SHOW_DRAFTS=1`; rebuild without it before using `astro preview` to judge the production page.
- Node 20 deprecation warning in the deploy run (`configure-aws-credentials@v5`, `pnpm/action-setup@v4`); bump the actions when newer majors exist.
- The Worker maps S3 403 to the 404 page, so a broken key would show as 404s; the smoke test's 200 on `/` is what catches that.
- The CSP is report-only and has no report endpoint; check the browser console on every page before enforcing.

## How to run things locally (reminder)

- Node: fnm (`.nvmrc` is `22`). If `node -v` is below 22.23.4, run `source ~/.bashrc`.
- AWS: `aws login --profile sorted` (the session expires; `AWS_PROFILE=sorted` for Terraform).
- Terraform in `infra/main`: needs `terraform.tfvars` (git-ignored) and `CLOUDFLARE_API_TOKEN` exported. Use `terraform plan -out=tfplan` then `terraform apply tfplan`, from `infra/main`.
- The owner runs commands that touch secrets or the live account, and force-pushes after a rebase. The assistant prepares the exact commands and reviews the output.
- Site: `pnpm --filter @vdd/site dev` serves http://localhost:4321/; add `SHOW_DRAFTS=1` to see the draft `example` page with the diagram. Worker: `pnpm --filter @vdd/worker test`. e2e: `pnpm --filter @vdd/e2e test`.
- `documentation/`, `case-studies/`, `.claude/` and `CLAUDE.md` are excluded from Prettier.

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
- Design gotchas: inline `style` attributes are blocked by the CSP and counted by the e2e test, so dynamic sizes are SVG geometry (rect `width`) or classes; `hidden` is not a typed attribute on `<svg>` in Astro (use a class); `clip-path` cuts a blur, so put `filter: blur()` on the parent of the clipped shape.
- React Flow under a strict CSP: Astro islands add inline script/style; the lazy `mount.ts` does not. d3-zoom sets `touch-action: none` on the pane, so flow.css hands it back to the browser (touch swipes must keep scrolling). A `pkill -f "serve.mjs"` inside a Bash command kills its own shell; use `pkill -f "serve[.]mjs"`.
