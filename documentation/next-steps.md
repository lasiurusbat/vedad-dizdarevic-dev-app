# Next steps

Working log for picking up where the last session stopped. Task-level detail stays in [implementation-plan.md](implementation-plan.md), the schedule in [roadmap.md](roadmap.md). Overwrite this file at the end of each session.

## Stopped at: 2026-11-06 (day 5, late evening)

**Merged today after the morning:** #40–#54. Open: **#55** (`fix/rainalert-copy`), the three Rain Alert commits that were pushed to #54 after it was merged (the 900 stat, title A, the copy-review edits, EN and DE) plus these docs. Merge #55 first next session.

### Evening: Sorted finished, dark by default, Rain Alert in EN and DE

- **Sorted restructure complete:** fact sheet with status line and short facts (#46), gallery order dashboard first (#47), sections by decision (#48) with a Gained | Price ledger under each heading (#51), diagram path buttons Requests / Mail / Releases (#49), Limitations table and full-width closing band (#50).
- **e2e on Sorted (#52):** the draft `example` pages are deleted; the e2e build is the production build without drafts.
- **Dark by default (#53):** whatever the device setting; light only through the header switch. Tests pick a theme with `tests/e2e/theme-state.ts`, not `colorScheme` emulation.
- **Rain Alert (#54, plus #55):** EN and DE from `case-studies/RainAlert-Case-Study.md`. Diagram `rainalert-release` (compact, Releases and Requests paths), five decision ledgers, problem log, the forecast panel shown 1:1 (`ThemedScreenshot placement="natural"`), a two-image gallery (`dark` optional), tech stack, Limitations (two rows, confirmed by the owner). Header illustration `RainIllustration.astro` ("umbrella", picked from three options; its two words follow the page language). Title A: "from git tag to a checked release, on free tiers"; stats 13+, 0, $0, 900.
- **Owner facts (2026-11-06):** the uptime check for rainalert.live is running; the street photo behind the app screenshot is the owner's own; the puddle artwork is AI-generated (captioned).
- **Lesson:** the owner merges quickly. Do not push more commits to a PR after saying it is ready; open a follow-up PR from `main` instead (the #54 commits had to be moved to #55).

## Next (in this order)

1. ~~Sorted page restructure~~ done (#40, #46, #48, #49, #50).
2. ~~Sorted German version~~ done (#43). The draft `example` entries are deleted and the e2e tests run on Sorted, against the production build without drafts (#52).
3. ~~Tests for the new pieces~~ done: `tests/e2e/motion.spec.ts` (gallery buttons and edge fades, no-JS fallback, one hero variant per load and never the same twice, blocked sessionStorage, reduced motion) and `tests/e2e/components.spec.ts` (`TechStack`, `ScalingPath`, `DashboardMap`).
4. ~~RainAlert case study~~ done in EN and DE (#54, #55); the closing band links each case study to the next (#56).
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
- Site: `pnpm --filter @vdd/site dev` serves http://localhost:4321/; the dev server and `SHOW_DRAFTS=1` include `draft: true` case studies (none exist now). Worker: `pnpm --filter @vdd/worker test`. e2e: `pnpm --filter @vdd/e2e test`.
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
