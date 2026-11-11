import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Case studies. One MDX file per language and project:
 *   src/content/case-studies/en/<slug>.mdx   ->  /projects/<slug>/
 *   src/content/case-studies/de/<slug>.mdx   ->  /de/projects/<slug>/
 * The language is the folder (no `language` field, so it cannot disagree with the URL). A project
 * does not need a German file at launch; the language switch then falls back to the home page.
 * Frontmatter fields drive the card and the structured part of the page; the MDX body is the
 * free-form write-up (diagrams, screenshots, longer reasoning). Decisions live in the body: each
 * opens its own section with a <TradeOff gained price /> note next to its evidence.
 */
const caseStudies = defineCollection({
  loader: glob({ pattern: '*/[^_]*.mdx', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    /** One or two sentences, shown on the card and used as the meta description. */
    summary: z.string().max(240),
    /** The problem or goal in a sentence or two. */
    problem: z.string(),
    stack: z.array(z.string()).min(1),
    /**
     * Fact sheet under the summary: a status line, then a row of short facts (label above value).
     * `status` is the text beside the live dot; it shows only with a `liveLinks` entry, whose
     * domain becomes the link. `facts` are a few words each (role, built, region); the source
     * cell is added from `repoUrl` / `repoPrivate`, so it does not belong here.
     */
    status: z.string().optional(),
    /**
     * `live` (default): the product runs; the card and page say nothing extra. `in-progress`: a
     * teaser for work that is not deployed yet; the card gets an "In progress" chip and the page
     * shows `status` with a static dot even without `liveLinks`. Never pair it with `liveLinks`.
     */
    stage: z.enum(['live', 'in-progress']).default('live'),
    facts: z
      .array(z.object({ label: z.string(), value: z.string().max(32) }))
      .max(5)
      .default([]),
    /** Outcome metrics, e.g. { label: 'Monthly cost', value: '€4' }. Shown under the fact sheet. */
    outcomes: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    /** One honesty sentence under the stats: what is measured, estimated or not yet drilled. */
    outcomesNote: z.string().optional(),
    /**
     * Optional cost comparison: monthly estimates per environment, itemised. Not part of the
     * summary; the MDX body places it with `<CostComparison costs={props.costs} />` (the page
     * passes the parsed `costs` to `<Content />`).
     * Always estimates; `footnote` must say where the figures come from. A `null` cell means
     * "not itemised" (shown as a dash). `total` is the source's own rounded figure, so it may
     * differ slightly from the sum of the rows.
     */
    costs: z
      .object({
        title: z.string(),
        /** Short callout next to the title, e.g. '−62% in dev'. */
        highlight: z.string().optional(),
        itemHeader: z.string(),
        columns: z
          .array(
            z.object({
              label: z.string(),
              total: z.number(),
              /** The column the chart is about; gets the accent colour. */
              emphasis: z.boolean().default(false),
            }),
          )
          .min(2)
          .max(4),
        rows: z.array(z.object({ item: z.string(), values: z.array(z.number().nullable()) })),
        currency: z.string().default('$'),
        footnote: z.string(),
      })
      .optional(),
    repoUrl: z.url().optional(),
    /** The source exists but is not public; the page then says so instead of linking. */
    repoPrivate: z.boolean().default(false),
    /** Something live or visual: a pipeline run, a Grafana screenshot, a demo. */
    liveLinks: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
    /** Symbolic line-art illustration beside the title on wide screens, one per case study, from
     * src/components/illustrations/ (the layout maps each id to its component). */
    illustration: z.enum(['inbox', 'umbrella', 'headers']).optional(),
    /** Lower comes first on the home page. */
    order: z.number().default(100),
    /** Drafts are left out of production builds; SHOW_DRAFTS=1 (dev, e2e) includes them. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { caseStudies };
