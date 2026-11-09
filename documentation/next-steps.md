# Next steps

Working log for picking up where the last session stopped. Task-level detail stays in [implementation-plan.md](implementation-plan.md), the schedule in [roadmap.md](roadmap.md). Overwrite this file at the end of each session.

## Stopped at: 2026-11-09 (end of the session begun on 2026-11-08, day 7)

**Merged:** #62–#80 and infra #10. No other PRs are open in either repo. M3 is done. The contact form is live and delivers real mail, also under the enforced CSP. Phase 8's build work is done. The privacy policy is live; the Impressum is not.

**Start next with the rest of Phase 9, in small PRs:** ~~`html-validate`~~ (done); ~~the link checker~~ (done: `tests/links/check-internal.mjs` in the `site` job, `links.yml` weekly with lychee; run it once by hand from the Actions tab); ~~Dependabot~~ (done, #82 and infra #11); ~~wider axe and layout coverage~~ (done: `tests/e2e/sweep.spec.ts`). `lighthouse` has passed on `main` since #75: propose adding it to the required checks. Then Phase 10.

**Waiting on the owner, blocks launch:** a serviceable address for the Impressum that is not the owner's home (for example a business address service). The site is live without an Impressum until then; once there is an address, add `/impressum/` in both languages, the footer link, and the address in the policy's first section. **Also:** a legal review of the privacy policy (written from what the site does, not by a lawyer), including whether email alone is enough contact detail; the data processing agreements for Cloudflare and AWS; a safeguard for mail stored at Purelymail in the USA (Add Rabbit LLC, servers in AWS us-east-1): the policy states the fact but names no legal mechanism, because none is confirmed, so get a DPA with standard contractual clauses from Purelymail or move the mailbox to an EU provider; delete `cv/reference/` and `../cv-reference-backup/` when happy with the CV; SRE-Project README; whether to keep the `workflow` scope on `gh`; the reply to GitHub Support ticket #4972996.

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
6. **Check the icon and logo usage terms** (AWS icons, GitHub Invertocat, Cloudflare logo, all unmodified; decide whether an attribution line is needed). Add a static fallback image for the Sorted diagrams in the no-JS case. 
7. ~~Add `e2e` to the required checks on `main`~~ done 2026-11-08.
8. Add the Lighthouse, Observatory, SSL Labs and securityheaders.com results to the `this-site` page (all A+; Lighthouse 97–99 and 100s), if the owner wants them there.
9. **When the AWS exam is passed:** download the badge from Credly, add it to `site/src/assets/credentials/`, set `badge`, `status: 'earned'`, `issued` and the Credly URL in `credentials.ts`.
10. **Live check** of the geo redirect through a German VPN.
11. **Remind the owner at the start of Phase 10** about the Cloudflare Web Analytics site (see loose ends). Diagram pages are at 137 of the 140 KB JS budget (2026-11-08), and Sorted at 452 of 500 KB page weight: little room for growth.
12. **Refresh the billed costs** when November is complete (same method; footnote dates change).

## Key rotation

- The `vdd-worker` access key (ends in `...OI3S`) was created on **2026-11-03** and set as Worker secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
- **Rotate by 2027-02-01** (90 days): create a second key in IAM, `wrangler secret put` both values in a real terminal (through `!` it stores an empty value), check the smoke test, then delete the old key. IAM allows two keys per user, so this needs no downtime.

## Small loose ends

- **REMIND THE OWNER at the start of Phase 10:** the Cloudflare Web Analytics site created by an early apply still exists (`auto_install`) but is not in Terraform state (the API token gets 403). Check whether it injects a beacon (the CSP and GDPR rules matter), then decide: keep it, manage it by hand, or delete it. The owner asked to be reminded when we reach Phase 10.
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
- The Terraform token cannot manage Cloudflare Web Analytics (403). Not in Terraform for now.
- Worker tests: the edge cache persists across tests within a file, so each test uses its own host. `@cloudflare/vitest-plugin` replaced the deprecated `vitest-pool-workers`; `SELF` is gone.
- URL parsing collapses `%2e%2e` before the Worker sees it; the Worker itself rejects `..%2f` style paths.
- Two PRs that both change `pnpm-lock.yaml` conflict; rebase, take the other lockfile, run `pnpm install`.
- Design gotchas: inline `style` attributes are blocked by the CSP and counted by the e2e test, so dynamic sizes are SVG geometry (rect `width`) or classes; `hidden` is not a typed attribute on `<svg>` in Astro (use a class); `clip-path` cuts a blur, so put `filter: blur()` on the parent of the clipped shape.
- React Flow under a strict CSP: Astro islands add inline script/style; the lazy `mount.ts` does not. d3-zoom sets `touch-action: none` on the pane, so flow.css hands it back to the browser (touch swipes must keep scrolling). A `pkill -f "serve.mjs"` inside a Bash command kills its own shell; use `pkill -f "serve[.]mjs"`.
