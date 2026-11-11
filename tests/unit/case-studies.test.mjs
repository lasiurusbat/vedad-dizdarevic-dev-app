// Content rules for the case studies, checked on the MDX frontmatter (no dependencies: only the
// top-level fields are read). They guard what the schema cannot say: that EN and DE agree, that an
// in-progress teaser never looks live, and that every illustration id is wired up.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { de } from '../../site/src/i18n/de.ts';
import { en } from '../../site/src/i18n/en.ts';

const root = new URL('../../site/src/', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

/** Top-level frontmatter: scalar fields as strings, block fields (lists, maps) as raw text. */
function frontmatter(source) {
  const block = source.match(/^---\n([\s\S]*?)\n---/)?.[1];
  assert.ok(block, 'no frontmatter');
  const fields = {};
  let key = null;
  for (const line of block.split('\n')) {
    const top = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (top) {
      key = top[1];
      fields[key] = top[2].replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1');
    } else if (key) fields[key] += '\n' + line;
  }
  return fields;
}

const languages = ['en', 'de'];
const studies = {}; // slug -> { en: fields, de: fields }
for (const lang of languages) {
  const dir = `content/case-studies/${lang}/`;
  for (const file of readdirSync(new URL(dir, root)).filter((f) => f.endsWith('.mdx'))) {
    const slug = file.replace(/\.mdx$/, '');
    (studies[slug] ??= {})[lang] = frontmatter(read(dir + file));
  }
}

describe('case studies: EN and DE agree', () => {
  for (const [slug, pair] of Object.entries(studies)) {
    test(`${slug} exists in both languages`, () => {
      assert.deepEqual(Object.keys(pair).sort(), [...languages].sort());
    });

    test(`${slug}: the language-independent fields match`, () => {
      for (const key of ['order', 'stage', 'illustration', 'repoPrivate', 'draft']) {
        assert.equal(pair.en?.[key], pair.de?.[key], key);
      }
    });

    test(`${slug}: same number of outcome stats, and at most four (the stats grid has four columns)`, () => {
      const count = (f) => (f?.outcomes?.match(/^\s*- label:/gm) ?? []).length;
      assert.equal(count(pair.en), count(pair.de));
      assert.ok(count(pair.en) <= 4, `${count(pair.en)} stats`);
    });

    for (const lang of languages) {
      test(`${slug} (${lang}): the summary fits the card and the meta description`, () => {
        const { summary } = pair[lang];
        assert.ok(summary.length > 0 && summary.length <= 240, `${summary.length} characters`);
      });
    }
  }
});

describe('case studies: an in-progress teaser never looks live', () => {
  const teasers = Object.entries(studies).filter(
    ([, pair]) => pair.en.stage === "'in-progress'" || pair.en.stage === 'in-progress',
  );

  test('at least one teaser exists (WhoCalledBack), so these checks run', () => {
    assert.ok(teasers.some(([slug]) => slug === 'whocalledback'));
  });

  for (const [slug, pair] of teasers) {
    for (const lang of languages) {
      const f = pair[lang];
      test(`${slug} (${lang}): no live links, a dated status, a private source`, () => {
        assert.ok(!('liveLinks' in f), 'an in-progress project must not carry liveLinks');
        assert.match(f.status, /20\d\d/, 'the status line needs its "as of" date');
        assert.equal(f.repoPrivate, 'true');
        assert.ok(f.outcomesNote?.length > 0, 'figures that are targets need the honesty note');
      });
    }

    test(`${slug}: not in the Work with me grid until something is deployed`, () => {
      for (const t of [en, de]) {
        assert.ok(
          !t.hireProjects.some((p) => p.slug === slug),
          `${slug} is listed in hireProjects`,
        );
      }
    });
  }

  test('the chip text exists in both languages and is short', () => {
    for (const t of [en, de]) {
      assert.equal(typeof t.caseInProgress, 'string');
      assert.ok(t.caseInProgress.length > 0 && t.caseInProgress.length <= 16, t.caseInProgress);
    }
    assert.notEqual(en.caseInProgress, de.caseInProgress);
  });
});

describe('Work with me grid points at real case studies', () => {
  for (const [name, t] of Object.entries({ en, de })) {
    test(`${name}: every project is a published case study`, () => {
      for (const p of t.hireProjects) assert.ok(studies[p.slug], `unknown project ${p.slug}`);
    });

    test(`${name}: every proof key names a listed project`, () => {
      const slugs = new Set(t.hireProjects.map((p) => p.slug));
      for (const s of t.hireServices) {
        for (const slug of Object.keys(s.proof ?? {}))
          assert.ok(slugs.has(slug), `${s.title}: ${slug}`);
      }
    });
  }
});

describe('header illustrations are wired up', () => {
  const schema = read('content.config.ts');
  const layout = read('layouts/CaseStudyLayout.astro');
  const ids = schema
    .match(/illustration:\s*z\.enum\(\[([^\]]*)\]\)/)?.[1]
    .split(',')
    .map((s) => s.trim().replace(/^'|'$/g, ''))
    .filter(Boolean);
  const files = readdirSync(new URL('components/illustrations/', root))
    .filter((f) => f.endsWith('.astro') && f !== 'Frame.astro')
    .map((f) => f.replace(/\.astro$/, '').toLowerCase());

  test('the schema lists at least the three original ids', () => {
    assert.ok(ids && ['inbox', 'umbrella', 'headers'].every((id) => ids.includes(id)), String(ids));
  });

  test('every schema id has a component file and an entry in the layout map', () => {
    for (const id of ids) {
      assert.ok(files.includes(id), `no illustrations/${id}.astro`);
      assert.match(layout, new RegExp(`\\b${id}:\\s*[A-Z]`), `${id} is missing in the layout map`);
    }
  });

  test('every component file is a schema id, so none is left unused', () => {
    for (const f of files) assert.ok(ids.includes(f), `${f}.astro is not in the schema enum`);
  });

  test('every illustration in use names a known id', () => {
    for (const [slug, pair] of Object.entries(studies)) {
      const id = pair.en.illustration;
      if (id) assert.ok(ids.includes(id.replace(/'/g, '')), `${slug}: ${id}`);
    }
  });
});
