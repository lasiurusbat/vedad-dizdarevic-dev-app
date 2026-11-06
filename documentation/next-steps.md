# Next steps

Working log for picking up where the last session stopped. Task-level detail stays in [implementation-plan.md](implementation-plan.md), the schedule in [roadmap.md](roadmap.md). Overwrite this file at the end of each session.

## Stopped at: 2026-11-05 (day 4, end of day)

**Everything from today is merged and deployed** (no open PRs; deploy and CI green on `main` at #27). Today: the Sorted case study DevOps-first (#19), diagram spike (#20), docs (#21), hero line (#22), Sorted diagram (#23), the design pass (#24, #25), the header light/dark switch and top-of-page bloom (#28), and diagram logos and theme-aware icons (#27, rebased onto the design pass).

- **Look:** Better Stack-inspired "console" style: near-black canvas, heavily desaturated blue-teal accent, DM Sans headings (Fontsource; Inter Tight until 2026-11-06), Inter body at 15–16px, 10px button corners, gradient Contact button, `card` utility with a top-lit fade and line art, section dividers that fade at both ends (light bloom under the first one), a large bloom under the header on every page. Details: tech-stack.md, Styling, "Visual style".
- **Theme switch:** right end of the header. Follows the device until used, then `localStorage` plus `data-theme` on `<html>`; `public/theme.js` applies it before paint. Tokens use `light-dark()`; theme-specific images use `.only-light` / `.only-dark`. Never theme with `prefers-color-scheme` media or `dark:` (rule in CLAUDE.md).
- **Hero:** name and role as one display headline spanning the text column (per-language ratios, rule in CLAUDE.md), the owner's line ("Building scalable, production-ready cloud platforms through Infrastructure as Code, platform architecture, containerization, and Kubernetes orchestration."), blinking availability dot, a made-up AWS diagram in three random variants (Fargate, EKS, EC2) with a light shaft.
- **About** has its first text (EN, DE): 3D/CGI and render pipelines, the DataScientest diploma, Sorted and this site as proof, AWS SAA in progress, a personality line. The 3D/CGI story moved out of the hero (owner's decision).
- **Sorted page:** sideways screenshot gallery with a "Demo data" badge, a metric strip, a cost comparison card (owner's estimates from `case-studies/Sorted-architecture.md`), "Problems I hit" as an incident log, and the architecture diagram with GitHub/Cloudflare logos.
- **How the owner works on design:** screenshots of betterstack.com with one-line requests; render every change in light and dark (and a phone width) before reporting. Rejected along the way: a hero screenshot slideshow, a frosted-glass gallery frame, full-size image links.
- **Branch hygiene lesson:** pushing stale local branches created a conflicting PR (#26, closed). Before pushing old branches, check whether their content is already on `main`; rebase real work first.

## Next (in this order)

1. **Fix the Tailwind typography backticks** around inline code in prose (`.prose code::before, .prose code::after { content: none }` in `site/src/styles/global.css`); the owner asked for it to ride along with the next content PR.
2. **Sorted German version** (`de/sorted.mdx`), including German texts for the gallery cards, the `costs` block and the problem log. Then delete the draft `example` entries and move the e2e tests (`case-studies.spec.ts`, `diagram.spec.ts`) to Sorted.
3. **Tests for the new pieces:** gallery prev/next and edge fades, the random hero variant (exactly one visible), reduced motion.
4. **Infrastructure screenshot for Sorted:** retake the Grafana prod dashboard (fix the Uptime panel that shows "No data"); a good candidate for the gallery. Never caption it as customer traffic.
5. **RainAlert case study** (EN, then DE), DevOps-first like Sorted; reuse `costs` and `ProblemLog` where the notes support them. The puddle image is AI-generated; say so in the caption.
6. Rest of Phase 4: Skills groups, Work with me, How this site is built; About still lacks languages; About could link "Sorted" to its case study. Optional: on tablets, narrow the hero sentence to the headline's width.
7. **Check the icon and logo usage terms** (AWS icons, GitHub Invertocat, Cloudflare logo, all unmodified; decide whether an attribution line is needed). Add a static fallback image for the Sorted diagram in the no-JS case. Phase 0 inputs still open: Impressum details (needed by D20).
8. **Owner:** add `e2e` to the required checks on `main`.
9. Header CV link comes with Phase 5; footer links to How-this-site-is-built, Impressum and Datenschutz when those pages exist.
10. **When the AWS exam is passed:** download the badge from Credly, add it to `site/src/assets/credentials/`, set `badge`, `status: 'earned'`, `issued` and the Credly URL in `credentials.ts`.
11. **Live check** of the geo redirect through a German VPN.
12. **Remind the owner at the start of Phase 10** about the Cloudflare Web Analytics site (see loose ends). Phase 9: set the page-weight budget (diagram-page JS budget proposed at 140 KB gzipped); the home page now ships the hero diagram SVGs and a small script (no React).

## Key rotation

- The `vdd-worker` access key (ends in `...OI3S`) was created on **2026-11-03** and set as Worker secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
- **Rotate by 2027-02-01** (90 days): create a second key in IAM, `wrangler secret put` both values, check the smoke test, then delete the old key. IAM allows two keys per user, so this needs no downtime.

## Small loose ends

- **REMIND THE OWNER at the start of Phase 10:** the Cloudflare Web Analytics site created by an early apply still exists (`auto_install`) but is not in Terraform state (the API token gets 403). Check whether it injects a beacon (the CSP and GDPR rules matter), then decide: keep it, manage it by hand, or delete it. The owner asked to be reminded when we reach Phase 10.
- The Sorted page states costs as estimates and says failover and backup restores are designed but not drilled. Update only when the owner confirms a drill happened. The owner approved publishing that the deploy role is an administrator (2026-11-04).
- Untracked local files: `.claude/` (the installed `copywriting` skill from `coreyhaines31/marketingskills`, MIT; decide whether to commit or git-ignore it), `case-studies/Sorted-architecture.md` (source for the diagram and the cost card), the Grafana placeholder screenshot and a stray `architecture.md:Zone.Identifier` (delete it).
- The preview server (`astro preview`, port 4321) may still be running: `pnpm --filter @vdd/site exec astro preview stop`.
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
