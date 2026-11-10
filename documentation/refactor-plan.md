# Refactor plan

Written 2026-11-10 from a read of the app repo (the infra repo was not reviewed). The architecture is sound and needs no large refactor. The plan is a series of small PRs, each branched from `main`, that remove duplicated knowledge. Tick an item when its PR is merged.

## What stays as it is

- **Worker and Lambda:** small modules with one job each, pure functions for paths, locale and headers, and a handler that takes its SES client as a parameter.
- **Content model:** language by folder and a typed schema. The EN and DE files of all three case studies have the same structure.
- **Styling:** tokens in `global.css` and scoped styles per component.
- **The smoke test's own list of the six headers:** it repeats the Worker's list on purpose, as an independent check.

## PRs, in order of value

Items 1 to 4 are worth doing before launch. Items 5 to 10 can wait until after it.

### 1. One contact contract

- [x] Done (#128, merged 2026-11-10; a real message through the live form arrived)

**Problem.** The email pattern exists twice (the `ContactForm.astro` script and `lambda/contact/src/validate.ts`). The limits (name 100, email 254, message 10 to 5000) exist three times: HTML attributes, client checks, Lambda. The types `job | freelance | other` are in both i18n files and the Lambda. The list of fields the Worker forwards is written out in `worker/src/contact.ts`.

**Change.** A workspace package `packages/contact-schema` (TypeScript source, no dependencies) holds the limits, the email pattern, the types, the languages and the field list. The site, the Worker and the Lambda import it. The Lambda's `validate()` stays where it is and keeps the last word.

**Check.** Lambda, Worker and e2e tests pass; the Lambda bundle still builds as one file; after the deploy, one real message through the form.

### 2. Client scripts out of `.astro` files

- [x] Done (2026-11-10). The two large scripts are `site/src/scripts/contact-form.ts` and `screenshot-gallery.ts`; the five short ones (3 to 41 lines) stay in their components, now linted by `eslint-plugin-astro`.

**Problem.** `ContactForm.astro` carries 184 lines of script and `ScreenshotGallery.astro` 92. ESLint has no Astro plugin, so this code is not linted, and it cannot be unit-tested.

**Change.** Move each script to `site/src/scripts/*.ts` and import it from the component's `<script>`. The bundle and the CSP stay the same. Add `eslint-plugin-astro` in the same PR.

### 3. One way to get the locale

- [x] Done (2026-11-10). Components used in MDX read the locale from the URL (`getLocale(Astro.currentLocale)`), so no MDX file passes `locale` any more. Page-level components (Home, Header, Footer and the like) keep their `locale` prop: the route files set it once, next to the URL that decides it.

**Problem.** Ten components read `Astro.currentLocale`; the rest take a `locale` prop, which the MDX files pass by hand (`locale="en"`). A wrong value in a German file would render mixed languages with no error.

**Change.** One helper around `Astro.currentLocale`; drop the prop from the components used in MDX. Replace the `'en' | 'de'` literals in `site.ts` and `diagrams/types.ts` with `Locale`.

### 4. A diagram registry

- [x] Done (2026-11-10). `site/src/diagrams/index.ts` is the one list of diagrams; `Diagram.astro`, the schema's `diagram` field and the `viewFullSize` string it alone used are gone.

**Problem.** The four diagrams are mapped by id in three places: `FlowDiagram.tsx`, twice in `ArchitectureDiagram.astro`, and a hand-typed id union in its props.

**Change.** `diagrams/index.ts` exports the map and `DiagramId`; the `as never` cast in `mount.ts` goes. Delete `Diagram.astro` and the schema's `diagram` field, both unused.

### 5. Illustrations folder

- [ ] Done

**Problem.** Three components hold about 1,500 lines, about 980 of them CSS. `CaseStudyLayout.astro` picks one through a nested ternary over three variant types. `@keyframes appear` is defined four times across components.

**Change.** Move them to `components/illustrations/`, split `CaseIllustration.astro` (three variants in 687 lines) into one file per variant, and choose by a variant-to-component map. Move base rules to one stylesheet only after checking that they are identical.

### 6. Home and page shells

- [ ] Done

**Problem.** `Home.astro` loops over a sections array and then switches on the id in a five-way ternary. The `comingSoon` branch and string are dead. The EN and DE files for `index.astro` and `projects/[slug].astro` differ only in the locale literal.

**Change.** Write the five `<Section>` blocks out; remove `comingSoon`; move each page body into a shared component so the route files are a few lines.

### 7. MDX imports

- [ ] Done

**Problem.** Each case study repeats up to ten component imports.

**Change.** Pass them once through `<Content components={...} />` in the two route files.

### 8. CI

- [ ] Done

**Problem.** The checkout, pnpm, Node and install block is repeated in five CI jobs and the deploy. The site is built three times per PR (`site`, the e2e web server, `lighthouse`).

**Change.** A composite action for the setup. Optionally build once and pass `dist` as an artifact; this saves minutes, and the price is that the jobs depend on each other.

### 9. Worker tidy-up (optional)

- [ ] Done

Four response builders in `index.ts` and `contact.ts` repeat "security headers plus `no-store`", and `AwsClient` is constructed in two places. One `respond()` helper covers it. Low value; do it only when the file is touched anyway.

### 10. Data files (optional)

- [ ] Done

`skills.ts`, `credentials.ts` and `site.ts` sit at the `src` root, and structured data such as `hireServices` lives inside the i18n string files. A `src/data/` folder would separate data from UI strings.
