// Unit tests for the About copy: both languages must offer the same structure, because the
// About component renders the lead, two paragraphs and the facts list from these strings.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { de } from '../../site/src/i18n/de.ts';
import { en } from '../../site/src/i18n/en.ts';

const locales = { en, de };

for (const [name, t] of Object.entries(locales)) {
  describe(`About copy (${name})`, () => {
    test('lead and both paragraphs are filled in', () => {
      for (const key of ['aboutLead', 'aboutP1', 'aboutP2', 'aboutFactsTitle']) {
        assert.equal(typeof t[key], 'string', key);
        assert.ok(t[key].trim().length > 0, `${key} is empty`);
      }
    });

    test('the lead is one short sentence', () => {
      assert.ok(t.aboutLead.length <= 140, `lead is ${t.aboutLead.length} characters`);
      assert.equal(t.aboutLead.match(/[.!?](\s|$)/g)?.length, 1, 'lead must be a single sentence');
    });

    test('the second paragraph has exactly one {sorted} link marker', () => {
      assert.equal(t.aboutP2.split('{sorted}').length, 2);
    });

    test('no other paragraph carries the link marker', () => {
      assert.ok(!t.aboutLead.includes('{') && !t.aboutP1.includes('{'));
    });

    test('every fact has a label and a value, and labels are unique', () => {
      assert.ok(t.aboutFacts.length > 0);
      for (const f of t.aboutFacts) {
        assert.ok(f.label.trim() && f.value.trim(), JSON.stringify(f));
      }
      const labels = t.aboutFacts.map((f) => f.label);
      assert.equal(new Set(labels).size, labels.length);
    });

    test('the retired paragraph keys are gone', () => {
      assert.equal('aboutP3' in t, false);
      assert.equal('aboutLanguages' in t, false);
    });
  });
}

describe('About copy, EN against DE', () => {
  test('same number of facts', () => {
    assert.equal(en.aboutFacts.length, de.aboutFacts.length);
  });

  test('the facts have the same order: the language row is in the same place', () => {
    const at = (t, label) => t.aboutFacts.findIndex((f) => f.label === label);
    assert.equal(at(en, 'Languages'), at(de, 'Sprachen'));
    assert.notEqual(at(en, 'Languages'), -1);
  });

  test('the facts name the diploma date and the certification in both languages', () => {
    for (const t of [en, de]) {
      const all = t.aboutFacts.map((f) => f.value).join('\n');
      assert.match(all, /2024/);
      assert.match(all, /DataScientest/);
      assert.match(all, /AWS Certified Solutions Architect/);
    }
  });
});
