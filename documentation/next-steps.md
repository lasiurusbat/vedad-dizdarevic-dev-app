# Next steps

Working log for picking up where the last session stopped. Task-level detail stays in [implementation-plan.md](implementation-plan.md), the schedule in [roadmap.md](roadmap.md). Overwrite this file at the end of each session.

## Stopped at: 2026-11-05 (day 4)

**Done today:** the Sorted case study was rewritten DevOps-first and presented as the commercial product it is (live and commercially available at sorted.onl; #19 merged). The React Flow diagram spike is merged (#20): a Sorted production architecture diagram with the official AWS icons, drag-to-pan with a mouse, readable on desktop and phones. The hero positioning line was rewritten (not yet in a PR, see Next).

- **Framing rule:** the site sells Cloud & DevOps engineering. Case studies lead with the platform; the application is "the workload" after the infrastructure; outcomes are infrastructure figures. Showroom+ is not mentioned. See the rules in `CLAUDE.md`.
- **Diagrams must not use Astro islands.** `@astrojs/react` and `client:*` fail the CSP. The working pattern is `mount.ts` plus `ArchitectureDiagram.astro`. `tests/e2e/diagram.spec.ts` enforces the production CSP.
- The diagram appears only on the draft `example` case study (`SHOW_DRAFTS=1`, `/projects/example/`), not yet on the Sorted page.
- Lesson: do not stack PRs; branch from `main`. A git worktree (`git worktree add ../app-diagram-spike`) kept an experiment separate from uncommitted work. Remove it with `git worktree remove ../app-diagram-spike`.

## Next (in this order)

1. **Add the diagram to the Sorted page** (`en/sorted.mdx`, under Architecture) and write the **German text description** (`description.de` in `site/src/diagrams/sorted-production.ts`). The diagram is already merged; this is a small PR.
2. **Hero line PR (uncommitted edits in `site/src/i18n/{en,de}.ts`):** "After more than a decade in 3D/CGI, I build and run production infrastructure on AWS with Terraform and Kubernetes." (DE: "Nach über zehn Jahren in 3D/CGI baue und betreibe ich Produktionsinfrastruktur auf AWS, mit Terraform und Kubernetes."). The owner confirmed Kubernetes in production.
3. **Infrastructure screenshot for Sorted:** retake the Grafana prod dashboard (fix the Uptime panel that shows "No data"), crop or add a light version, put it under the Operations bullet. Do not caption anything as customer traffic.
4. **Check AWS's icon usage terms** (icons are unmodified; decide whether an attribution line is needed). Add a static fallback image for the no-JS case.
5. **Sorted German version** (`de/sorted.mdx`). Then delete the draft `example` entries (and the diagram demo on them) and move the e2e tests (`case-studies.spec.ts`, `diagram.spec.ts`) to Sorted.
6. **RainAlert case study** (EN, then DE) from `case-studies/cs_rainalert/`, framed DevOps-first like Sorted; the puddle image is AI-generated, so say so in the caption and ask whether it is the card hero image.
7. Rest of Phase 4: Skills groups, About, Work with me, How this site is built. Phase 0 inputs still open: Impressum details (needed by D20), About text.
8. **Owner:** add `e2e` to the required checks on `main`; open and merge `content/case-study-sources` if still open.
9. Header CV link comes with Phase 5; footer links to How-this-site-is-built, Impressum and Datenschutz when those pages exist.
10. **When the AWS exam is passed:** download the badge from Credly, add it to `site/src/assets/credentials/`, set `badge`, `status: 'earned'`, `issued` and the Credly URL in `credentials.ts`. Exam planned within about four weeks of 2026-11-04.
11. **Live check** of the geo redirect through a German VPN.
12. **Remind the owner at the start of Phase 10** about the Cloudflare Web Analytics site (see loose ends). Also set the diagram-page JS budget (proposed 140 KB gzipped) in Phase 9.

## Key rotation

- The `vdd-worker` access key (ends in `...OI3S`) was created on **2026-11-03** and set as Worker secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
- **Rotate by 2027-02-01** (90 days): create a second key in IAM, `wrangler secret put` both values, check the smoke test, then delete the old key. IAM allows two keys per user, so this needs no downtime.

## Small loose ends

- **REMIND THE OWNER at the start of Phase 10:** the Cloudflare Web Analytics site created by an early apply still exists (`auto_install`) but is not in Terraform state (the API token gets 403). Check whether it injects a beacon (the CSP and GDPR rules matter), then decide: keep it, manage it by hand, or delete it. The owner asked to be reminded when we reach Phase 10.
- The Sorted page states costs as estimates and says failover and backup restores are designed but not drilled. Update only when the owner confirms a drill happened. The owner approved publishing that the deploy role is an administrator (2026-11-04).
- Untracked local files: `.claude/` (the installed `copywriting` skill from `coreyhaines31/marketingskills`, MIT; decide whether to commit or git-ignore it), `case-studies/Sorted-architecture.md` (source for the diagram), the Grafana placeholder screenshot and a stray `architecture.md:Zone.Identifier` (delete it).
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
- React Flow under a strict CSP: Astro islands add inline script/style; the lazy `mount.ts` does not. d3-zoom sets `touch-action: none` on the pane, so flow.css hands it back to the browser (touch swipes must keep scrolling). A `pkill -f "serve.mjs"` inside a Bash command kills its own shell; use `pkill -f "serve[.]mjs"`.
