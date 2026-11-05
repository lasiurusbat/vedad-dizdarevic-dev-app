# Next steps

Working log for picking up where the last session stopped. Task-level detail stays in [implementation-plan.md](implementation-plan.md), the schedule in [roadmap.md](roadmap.md). Overwrite this file at the end of each session.

## Stopped at: 2026-11-05 (day 4, evening)

**Done today:** the Sorted case study went DevOps-first and live-commercial (#19), the diagram spike merged (#20), the docs (#21), the hero line (#22) and the Sorted diagram (#23) merged. Then a full design pass on `feat/dark-console-theme` (19 commits, pushed, **PR not opened yet**):

- **Look:** Better Stack-inspired "console" style (the owner pasted its style reference): near-black canvas, heavily desaturated blue-teal accent, Inter Tight headings (Fontsource), 10px button corners, gradient Contact button, `card` utility with a top-lit fade and line art, header 80% opaque, section dividers that fade at both ends (light bloom under the first one only). Details: tech-stack.md, Styling, "Visual style".
- **Hero:** name and role as one display headline spanning the text column (fixed per-language ratios, see the CLAUDE.md rule), the owner's positioning line ("Building scalable, production-ready cloud platforms through Infrastructure as Code, platform architecture, containerization, and Kubernetes orchestration."), blinking availability dot, an animated made-up AWS diagram in three variants (Fargate, EKS, EC2) picked at random per load, and a light shaft behind it. Six new official AWS icons (release 07312026, unmodified).
- **About** has its first text (EN, DE): 3D/CGI and render pipelines, the DataScientest diploma, Sorted and this site as proof, AWS SAA in progress, personality line. The 3D/CGI story moved out of the hero (owner's decision).
- **Sorted page:** the three screenshots are a sideways-scrolling gallery with a "Demo data" badge; outcomes are a metric strip plus a cost comparison card (figures from `case-studies/Sorted-architecture.md`, labelled estimates); "Problems I hit" is an incident log.
- Rejected along the way: a hero screenshot slideshow (the owner wanted the diagram), a frosted-glass frame and full-size links in the gallery.

## Next (in this order)

1. **Open the PR** for `feat/dark-console-theme` (the owner merges). The deploy runs on merge; check the live site in both themes and the smoke test.
2. **`feat/diagram-logos`** has two local, unpushed commits from before the design pass (brand logos, drag only when zoomed in, "Simplified diagram." caption). Rebase onto `main` after step 1, re-check the colours against the blue-teal tokens, then PR.
3. **Fix the Tailwind typography backticks** around inline code in prose (`.prose code::before, .prose code::after { content: none }` in `site/src/styles/global.css`); the owner asked for it to ride along with the next content PR.
4. **Sorted German version** (`de/sorted.mdx`), including German texts for the gallery cards, the `costs` block and the problem log. Then delete the draft `example` entries and move the e2e tests (`case-studies.spec.ts`, `diagram.spec.ts`) to Sorted.
5. **Tests for the new pieces:** gallery prev/next and edge fades, the random hero variant (exactly one visible), reduced motion.
6. **Infrastructure screenshot for Sorted:** retake the Grafana prod dashboard (fix the Uptime panel that shows "No data"); a good candidate for the gallery. Never caption it as customer traffic.
7. **RainAlert case study** (EN, then DE), DevOps-first like Sorted; reuse `costs` and `ProblemLog` where the notes support them. The puddle image is AI-generated; say so in the caption.
8. Rest of Phase 4: Skills groups, Work with me, How this site is built; About still lacks languages; About could link "Sorted" to its case study. Optional: on tablets, narrow the hero sentence to the headline's width.
9. **Check AWS's icon usage terms** (icons are unmodified; decide whether an attribution line is needed). Phase 0 inputs still open: Impressum details (needed by D20).
10. **Owner:** add `e2e` to the required checks on `main`.
11. Header CV link comes with Phase 5; footer links to How-this-site-is-built, Impressum and Datenschutz when those pages exist.
12. **When the AWS exam is passed:** download the badge from Credly, add it to `site/src/assets/credentials/`, set `badge`, `status: 'earned'`, `issued` and the Credly URL in `credentials.ts`.
13. **Live check** of the geo redirect through a German VPN.
14. **Remind the owner at the start of Phase 10** about the Cloudflare Web Analytics site (see loose ends). Phase 9: set the page-weight budget; the home page now ships the hero diagram SVGs and a small script (no React).

## Key rotation

- The `vdd-worker` access key (ends in `...OI3S`) was created on **2026-11-03** and set as Worker secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
- **Rotate by 2027-02-01** (90 days): create a second key in IAM, `wrangler secret put` both values, check the smoke test, then delete the old key. IAM allows two keys per user, so this needs no downtime.

## Small loose ends

- **REMIND THE OWNER at the start of Phase 10:** the Cloudflare Web Analytics site created by an early apply still exists (`auto_install`) but is not in Terraform state (the API token gets 403). Check whether it injects a beacon (the CSP and GDPR rules matter), then decide: keep it, manage it by hand, or delete it. The owner asked to be reminded when we reach Phase 10.
- The Sorted page states costs as estimates and says failover and backup restores are designed but not drilled. Update only when the owner confirms a drill happened. The owner approved publishing that the deploy role is an administrator (2026-11-04).
- Untracked local files: `.claude/` (the installed `copywriting` skill from `coreyhaines31/marketingskills`, MIT; decide whether to commit or git-ignore it), `case-studies/Sorted-architecture.md` (source for the diagram and the cost card), the Grafana placeholder screenshot and a stray `architecture.md:Zone.Identifier` (delete it).
- The preview server (`astro preview`, port 4321) may still be running from this session: `pnpm --filter @vdd/site exec astro preview stop`.
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
