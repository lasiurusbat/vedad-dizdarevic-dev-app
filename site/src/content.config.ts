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
 * free-form write-up (diagrams, screenshots, longer reasoning).
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
    /** Two or three decisions with their trade-offs (cost, security, reliability). */
    decisions: z
      .array(z.object({ decision: z.string(), why: z.string() }))
      .min(1)
      .max(4),
    /** Outcome metrics, e.g. { label: 'Monthly cost', value: '€4' }. */
    outcomes: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    /**
     * Optional cost comparison under the outcomes: monthly estimates per environment, itemised.
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
    /** Id of a diagram in src/diagrams/ (Phase 4 diagram spike). */
    diagram: z.string().optional(),
    /** Lower comes first on the home page. */
    order: z.number().default(100),
    /** Drafts are left out of production builds; SHOW_DRAFTS=1 (dev, e2e) includes them. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { caseStudies };
