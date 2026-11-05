# Next steps

Working log for picking up where the last session stopped. Task-level detail stays in [implementation-plan.md](implementation-plan.md), the schedule in [roadmap.md](roadmap.md). Overwrite this file at the end of each session.

## Stopped at: 2026-11-04 (day 3, evening)

**Done today:** hero and page structure (#15), geo language redirect (#16), case study collection (#17), Certifications block under Skills (#18, merged), and the **Sorted case study in English** (PR #19, open, all checks passed locally). Phase 3 and the Phase 4 skeleton are complete.

- Case study pages: frontmatter drives problem, decisions, outcomes, links; the MDX body is the write-up. `repoPrivate: true` prints "Source code: private repository". `ThemedScreenshot` serves light/dark pairs as WebP from `/_astro/`.
- Certifications (`site/src/credentials.ts`): AWS Certified Solutions Architect – Associate as "In progress" (no emblem until passed), DevOps diploma (DataScientest), Docker & Kubernetes (Udemy). Claims plus verification links only. The diploma prints a date of birth, so `cv/reference/` PDFs are git-ignored.
- Lesson: do not stack PRs; branch from `main`.

## Next (in this order)

1. **Owner:** review PR #19 (the Sorted English text, especially numbers and the Limitations section) and merge it. Tell me what to change.
2. **Owner:** `content/case-study-sources` (notes and raw screenshots) is pushed but has no PR yet; open and merge it so the sources are in `main`.
3. **Owner:** add `e2e` to the required checks on `main` (if not done yet).
4. **Sorted German version** (`site/src/content/case-studies/de/sorted.mdx`) after the English is approved. Then delete the draft `example` entries and move the e2e tests (`case-studies.spec.ts`) from `example` to Sorted.
5. **RainAlert case study** (EN, then DE) from `case-studies/cs_rainalert/`: the repo is public (`lasiurusbat/RainAlert`); the puddle image is AI-generated, so say so in the caption and ask whether it is the card hero image.
6. **Diagrams:** the two Mermaid diagrams in the Sorted note (architecture, delivery flow) were left out; do the React Flow spike (plan, Phase 4 Diagrams) and add them.
7. Rest of Phase 4: Skills groups, About, Work with me, How this site is built. Phase 0 inputs still open: Impressum details (needed by D20), About text.
8. Header CV link comes with Phase 5; footer links to How-this-site-is-built, Impressum and Datenschutz when those pages exist.
9. **When the AWS exam is passed:** download the badge from Credly, add it to `site/src/assets/credentials/`, set `badge`, `status: 'earned'`, `issued` and the Credly URL in `credentials.ts`. Exam planned within about four weeks of 2026-11-04.
10. **Live check** of the geo redirect through a German VPN, now that #16 is deployed.
11. **Remind the owner at the start of Phase 10** about the Cloudflare Web Analytics site (see loose ends).

## Key rotation

- The `vdd-worker` access key (ends in `...OI3S`) was created on **2026-11-03** and set as Worker secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
- **Rotate by 2027-02-01** (90 days): create a second key in IAM, `wrangler secret put` both values, check the smoke test, then delete the old key. IAM allows two keys per user, so this needs no downtime.

## Small loose ends

- **REMIND THE OWNER at the start of Phase 10:** the Cloudflare Web Analytics site created by an early apply still exists (`auto_install`) but is not in Terraform state (the API token gets 403). Check whether it injects a beacon (the CSP and GDPR rules matter), then decide: keep it, manage it by hand, or delete it. The owner asked to be reminded when we reach Phase 10.
- Phase 0 content inputs still open: Impressum details (by D20) and the About text. Case study notes and screenshots for Sorted and RainAlert exist in `case-studies/`.
- The Sorted note says the deploy role is an administrator; the owner approved publishing that (2026-11-04).
- Node 20 deprecation warning in the deploy run (`configure-aws-credentials@v5`, `pnpm/action-setup@v4`); bump the actions when newer majors exist.
- The Worker maps S3 403 to the 404 page, so a broken key would show as 404s; the smoke test's 200 on `/` is what catches that.
- The CSP is report-only and has no report endpoint; check the browser console on every page before enforcing.

## How to run things locally (reminder)

- Node: fnm (`.nvmrc` is `22`). If `node -v` is below 22.23.4, run `source ~/.bashrc`.
- AWS: `aws login --profile sorted` (the session expires; `AWS_PROFILE=sorted` for Terraform).
- Terraform in `infra/main`: needs `terraform.tfvars` (git-ignored) and `CLOUDFLARE_API_TOKEN` exported. Use `terraform plan -out=tfplan` then `terraform apply tfplan`, from `infra/main`.
- The owner runs commands that touch secrets or the live account, and force-pushes after a rebase. The assistant prepares the exact commands and reviews the output.
- Site: `pnpm --filter @vdd/site dev` serves http://localhost:4321/. Worker: `pnpm --filter @vdd/worker test`.
- `documentation/`, `case-studies/` and `CLAUDE.md` are excluded from Prettier.

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
