// The contact form's copy against the shared contract: every type has a label in both languages,
// and the message error names the real minimum length.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { MESSAGE_MIN, TYPES } from '../../packages/contact-schema/src/index.ts';
import { de } from '../../site/src/i18n/de.ts';
import { en } from '../../site/src/i18n/en.ts';

for (const [name, t] of Object.entries({ en, de })) {
  describe(`Contact copy (${name})`, () => {
    test('the type options are exactly the types the Lambda accepts', () => {
      assert.deepEqual(
        t.contactTypes.map((type) => type.value),
        [...TYPES],
      );
    });

    test('the message error names the minimum length', () => {
      assert.ok(t.contactErrorMessage.includes(String(MESSAGE_MIN)), t.contactErrorMessage);
    });
  });
}
