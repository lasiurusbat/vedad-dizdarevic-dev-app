# Next steps

Working log for picking up where the last session stopped. Task-level detail stays in [implementation-plan.md](implementation-plan.md), the schedule in [roadmap.md](roadmap.md). Overwrite this file at the end of each session.

## Stopped at: 2026-11-10 (Phase 10 done except one manual fallback; Phase 11 started)

**State:** #110–#120 and infra #19, #20 are merged; the only open PR is the one that wrote this section.

**Phase 10 (monitoring and operations):** every rollback case in the runbook is tried (Worker 2026-11-09; revert PR #113/#114, bucket versions #116, Lambda #117/#118 and infra #19/#20 on 2026-11-10). Alarms, key rotation (workflow), pruning, the runbook and the `/de/` monitor are done. Left: the by-hand key rotation steps (the workflow ran; only the fallback is untried, and it touches the live key), the optional synthetic check of `/api/contact`, and reading the deploy log around 2026-12-03 to see pruning delete its first assets.

**Phase 11 (launch), 2026-11-10:**

- Done: no placeholder or test content (source grep and all 10 live pages).
- **DMARC:** still `p=none` (rua to `hello@`, `adkim=r`, `aspf=r`). Next: read an aggregate report in `hello@`, confirm the SES contact mail is aligned (SPF or DKIM pass with alignment), then an infra PR to `p=quarantine`, later `p=reject`. SPF is a single record.
- **Owner's launch test script** ([launch-test-script.md](launch-test-script.md)): real iPhone and Android, Firefox and Safari, proofreading EN and DE (a native German speaker for DE), every CTA, CV against LinkedIn, link previews, the German VPN check. Failures go back as `device or browser, page, what happened`; each is one small PR.
- After launch: site URL on LinkedIn, GitHub, CV and email signature; the LinkedIn post; Search Console after two weeks.

**Waiting on the owner:** a legal review of the privacy policy (written from what the site does, not by a lawyer), including whether email alone is enough contact detail; delete `cv/reference/` and `../cv-reference-backup/` when happy with the CV; SRE-Project README; whether to keep the `workflow` scope on `gh`; the reply to GitHub Support ticket #4972996 (don't rewrite or force-push either repo while it is open).

**Decided 2026-11-09:** no Impressum (home address stays private), the geo-redirect to `/de/` stays, Purelymail's US servers are accepted (the policy states the fact, names no mechanism).

**Notes:** the infra repo needs `github_owner_id` and `app_repo_id` in the owner's local `main/terraform.tfvars`. GitHub had a partial outage on 2026-11-09 and required checks went missing on a PR: closing and reopening it retriggers them. Shell lesson from the bucket test: set variables in one shell and quote version IDs.

### Late 2026-11-09: About redesign and its tests

- **About (#110, merged):** `About.astro` replaces the four-paragraph block: one lead sentence, two short paragraphs (the second links Sorted via `{sorted}`), and an "At a glance" definition list (`aboutFacts`, EN and DE) beside the text from `md` up. The old `aboutP3` and `aboutLanguages` keys are gone. `hero.spec.ts` and `layout.spec.ts` were adjusted (languages value without its label; the body-text parity check uses the second paragraph and no longer compares width).
- **Tests (#111, open when the session stopped; check it first):** `tests/unit/about-copy.test.mjs` (`node --test "tests/unit/*.test.mjs"`, a step in the `site` CI job, the first unit tests in the repo) and `tests/e2e/about.spec.ts`. The line-length test found 94 (EN) and 86 (DE) characters per line, so the column is capped at `max-w-[54ch]!` (the `!` is needed: the global `.prose` rule, 70ch, is unlayered). The case-study prose still runs at 70ch (about 94 characters); decide whether to narrow it too.
- **Gotcha:** the e2e suite serves the existing `site/dist`; rebuild with `pnpm --filter @vdd/site build` before running it.

### Day 6: closing-band links, tests, Skills, About, "How this site is built"

- **Next-case link (#56):** the closing band of every case study ends with "Next case study", in display order and wrapping round (`nextCaseStudy()` in `lib/caseStudies.ts`). The loop is now Sorted → Rain Alert → this site → Sorted.
- **Tests (#57):** `tests/e2e/motion.spec.ts` (gallery buttons and fades, no-JS, hero variant, reduced motion) and `tests/e2e/components.spec.ts` (`TechStack`, `ScalingPath`, `DashboardMap`).
- **Skills (#58):** eight groups from the CV's Technical Skills (October 2026) in `site/src/skills.ts`, platform first; Stripe and Windows left out.
- **About (#59, #62):** a languages line from the CV; "Sorted" in the second paragraph links to its case study (`{sorted}` placeholder in the i18n string, split in `Home.astro`).
- **How this site is built (#60):** built as a third case study, `this-site` (EN, DE; the owner chose this over a standalone page or a home section). Diagram `site-platform` (Requests, Contact and alerts (planned, dashed), Deploys), six decision ledgers, problem log, tech stack, seven Limitations. Every claim is from the app and infra repos; the copy was checked against the copywriting skill's AI-tells list. Footer link "How this site is built" on every page. `ProblemLog` code chips now wrap (a long OIDC subject made the page scroll sideways at 360px).
- **Header illustration (#61):** `SiteIllustration.astro` (`illustration: 'headers'`), chosen from three options and refined by the owner: a response leaves the locked bucket, stops in the Worker gate (which lights briefly), then leaves for the browser, lighting the six header chips; the browser frame shows the six smoke-test checks ticking in order.
- **Lesson:** the project skills in `app/.claude/skills/` (copywriting, frontend-design) only load when Claude Code is started from `app/`. Start sessions there.
- **Open questions on Work with me (2026-11-08):** the exact wording of "EU work permit" and whether to add "no sponsorship needed"; the formal "Ihr" in German; "Available now" needs changing once the owner accepts something.

### 2026-11-08: history rewrite and CV

- **CV PDFs and the Gmail address were removed from history** in both repos (#66, `git-filter-repo`, force-pushed by the owner). **GitHub Support ticket #4972996 is open**: old commit URLs and PR refs still expose the PDFs until it closes. Don't rewrite or force-push either repo while it is open. Afterwards, check that the old commit URL for `cv/Vedad_Dizdarevic_CV_EN_1026.pdf` at `c5af52d` stops working.
- **Phase 5 (CV):** built; see CLAUDE.md. Delete the local `cv/reference/` and `../cv-reference-backup/` once the owner is happy with the new PDFs.

### 2026-11-08: contact form (Phase 6)

- Built; see CLAUDE.md. Differences from the plan: the form needs JavaScript (Turnstile does), so there is no plain HTML POST; the email address is the fallback. The `gh-app-deploy` role needed `lambda:UpdateFunctionCode` and `lambda:GetFunctionConfiguration` on `vdd-contact` (infra `bootstrap/`).
- **Lambda concurrency is not capped** (AWS rejects a reservation on this account), so Turnstile and the coarse rate limit are the only brakes. The AWS budget alert is the backstop.
- **CSP and Turnstile:** the inline style seen with the test key on 2026-11-08 did not come back in the sweep before enforcing (same day): with the real key on the live domain and our policy enforced, only Cloudflare's own iframe logs `connect-src` errors, under Cloudflare's policy. Those are not ours. When checking this again, tell the iframe's messages apart by their source file, and click the field (the widget renders in a closed shadow root).
- **Live, confirmed 2026-11-08:** the owner sent a real message; it arrived at `hello@` and the reply reached the sender. The `this-site` case study is updated.
- **Worker secrets must be set in a real terminal:** `wrangler secret put` run through `!` (no stdin) stored an empty `TURNSTILE_SECRET_KEY` and reported success, so the form answered 503 after a green deploy. The smoke test now posts a made-up token, which catches this.
- **DMARC:** that message was the first real SES mail. Confirm it as aligned in a later report before moving to `p=quarantine`.

### 2026-11-08: SEO (Phase 8)

- Done: descriptions, canonical URLs, sitemap, `robots.txt`, JSON-LD and share images, rendered with Typst from a build-time endpoint so no image library is added. The colours in `site/src/og/card.typ` are copies of the dark tokens: change them together. The endpoint runs `typst`, so opening `/og/...` in `astro dev` needs it installed.
- Done by the owner on 2026-11-08: LinkedIn Post Inspector, Search Console and Bing verified, sitemap submitted. Check Search Console for errors in a few days.
- Search Console and Bing Webmaster Tools verify through files: keep `site/public/googlee75783b48c054b73.html` and `site/public/BingSiteAuth.xml` unchanged, or the verification lapses.
- Lighthouse SEO is 100 in CI (since #75). Left of the "done when": Search Console reporting no errors, which takes days.

## Next (in this order)

1. ~~Sorted page restructure~~ done (#40, #46, #48, #49, #50).
2. ~~Sorted German version~~ done (#43). The draft `example` entries are deleted and the e2e tests run on Sorted, against the production build without drafts (#52).
3. ~~Tests for the new pieces~~ done: `tests/e2e/motion.spec.ts` (gallery buttons and edge fades, no-JS fallback, one hero variant per load and never the same twice, blocked sessionStorage, reduced motion) and `tests/e2e/components.spec.ts` (`TechStack`, `ScalingPath`, `DashboardMap`).
4. ~~RainAlert case study~~ done in EN and DE (#54, #55); the closing band links each case study to the next (#56).
5. Rest of Phase 4: ~~Skills groups~~ (#58), ~~How this site is built~~ (the `this-site` case study, linked from the footer, #60, header illustration #61), ~~Work with me~~ (`WorkWithMe.astro`, status panel and services grid); About has its languages line (from the CV) and links "Sorted" to its case study. Optional: on tablets, narrow the hero sentence to the headline's width.
6. ~~Check the icon and logo usage terms~~ done 2026-11-09: the AWS, GitHub and Cloudflare pages state no attribution requirement (the AWS icon package's own licence text and GitHub's diagrams page were not read); GitHub forbids modifying the Invertocat, using it as the site's logo or implying endorsement, and the site does none of that. The footer carries a trademark line in both languages. The no-JS case is done too (#105): without JavaScript the empty canvas is hidden and the description shows as a list (`@media (scripting: none)` plus a `<noscript>` block, no image to keep in step with the diagrams).
7. ~~Add `e2e` to the required checks on `main`~~ done 2026-11-08.
8. ~~Add the Lighthouse, Observatory, SSL Labs and securityheaders.com results to the `this-site` page~~ done 2026-11-09 (section "What the checks report", EN and DE; Lighthouse from the CI artifact of the run on `main`, the scanners dated 2026-11-08). The same change added a "CV built from data" decision, and corrected the page: the Worker key is rotated by a weekly workflow, there are four OIDC roles (`vdd-key-rotation` is the fourth), the alarms include invocations, and the uptime monitors cover `/` and `/de/`. Refresh the Lighthouse and scanner figures when they change.
9. **When the AWS exam is passed:** download the badge from Credly, add it to `site/src/assets/credentials/`, set `badge`, `status: 'earned'`, `issued` and the Credly URL in `credentials.ts`.
10. **Live check** of the geo redirect through a German VPN.
11. ~~Cloudflare Web Analytics site~~ deleted by the owner 2026-11-09 (no beacon on the live page). Diagram pages are at 137 of the 140 KB JS budget (2026-11-08), and Sorted at 452 of 500 KB page weight: little room for growth.
12. **Refresh the billed costs** when November is complete (same method; footnote dates change).

## Key rotation

- The infra Cloudflare token `infra-terraform-vedad-dizdarevic-dev` expires **2027-11-02** (rolled 2026-11-09; copies: infra Actions secret and Dependabot secret).
- The `vdd-worker` access key (ends in `...Z7TB`) was created by the rotation workflow on **2026-11-09** and set as Worker secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. The first key (2026-11-03) is deleted.
- `.github/workflows/rotate-key.yml` rotates it every Monday once it is 80 days old (first automatic rotation about 2027-01-28; hard limit 90 days, 2027-02-07). The manual steps are in [runbook.md](runbook.md#rotate-the-workers-aws-key).

## Small loose ends

- Cloudflare Web Analytics: the orphan site was deleted by the owner on 2026-11-09 (the live page had no beacon). No analytics now; add one deliberately later if wanted (CSP and privacy policy change with it).
- The Sorted page states costs as estimates and says failover and backup restores are designed but not drilled. Update only when the owner confirms a drill happened. The owner approved publishing that the deploy role is an administrator (2026-11-04).
- Local-only files: `.claude/`, `case-studies/Sorted-architecture.md` and `case-studies/cs_rainalert/` stay out of git (listed in `.git/info/exclude`, owner's decisions 2026-11-06 and 2026-11-08). A fresh clone needs those lines added again.
- At 320px the header's theme button makes the page about 31px too wide. The site targets 360px and up; fix it if the header changes.
- A preview server may still be running on port 4199 (`tests/e2e/serve.mjs` serving `site/dist`): `pkill -f "serve[.]mjs"`.
- Old local branches whose PRs are merged can be deleted (`git branch --merged origin/main`); `feat/sorted-diagram` has one local commit that duplicates #27 and can go too.
- e2e runs rebuild `site/dist` with `SHOW_DRAFTS=1`; rebuild without it before using `astro preview` to judge the production page.
- Node 20 deprecation warning in the deploy run (`configure-aws-credentials@v5`, `pnpm/action-setup@v4`); bump the actions when newer majors exist.
- The Worker maps S3 403 to the 404 page, so a broken key would show as 404s; the smoke test's 200 on `/` is what catches that.
- The enforced CSP has no report endpoint (listed under Limitations on the `this-site` page).

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
- The Terraform token cannot manage Cloudflare Web Analytics (403); there is no analytics site now.
- Worker tests: the edge cache persists across tests within a file, so each test uses its own host. `@cloudflare/vitest-plugin` replaced the deprecated `vitest-pool-workers`; `SELF` is gone.
- URL parsing collapses `%2e%2e` before the Worker sees it; the Worker itself rejects `..%2f` style paths.
- Two PRs that both change `pnpm-lock.yaml` conflict; rebase, take the other lockfile, run `pnpm install`.
- Design gotchas: inline `style` attributes are blocked by the CSP and counted by the e2e test, so dynamic sizes are SVG geometry (rect `width`) or classes; `hidden` is not a typed attribute on `<svg>` in Astro (use a class); `clip-path` cuts a blur, so put `filter: blur()` on the parent of the clipped shape.
- React Flow under a strict CSP: Astro islands add inline script/style; the lazy `mount.ts` does not. d3-zoom sets `touch-action: none` on the pane, so flow.css hands it back to the browser (touch swipes must keep scrolling). A `pkill -f "serve.mjs"` inside a Bash command kills its own shell; use `pkill -f "serve[.]mjs"`.
