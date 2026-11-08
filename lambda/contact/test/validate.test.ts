import { describe, expect, it } from 'vitest';
import { validate } from '../src/validate';

const good = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  type: 'job',
  language: 'en',
  message: 'I would like to talk about a platform role.',
};

describe('validate', () => {
  it('accepts a good message and trims it', () => {
    expect(validate({ ...good, name: '  Ada  ', message: `  ${good.message}\n` })).toEqual({
      ...good,
      name: 'Ada',
    });
  });

  it('keeps line breaks in the message and drops other control characters', () => {
    const result = validate({ ...good, message: 'First line\nSecond\u0000 line\tend' });
    expect(result?.message).toBe('First line\nSecond line\tend');
  });

  it('drops extra fields', () => {
    expect(validate({ ...good, token: 'x', admin: true })).toEqual(good);
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'hello'],
    ['a missing name', { ...good, name: undefined }],
    ['an empty name', { ...good, name: '   ' }],
    ['a long name', { ...good, name: 'x'.repeat(101) }],
    ['a name with a line break', { ...good, name: 'Ada\nBcc: x@example.com' }],
    ['a name that is not text', { ...good, name: 42 }],
    ['an unknown type', { ...good, type: 'spam' }],
    ['a type that is not text', { ...good, type: ['job'] }],
    ['an unknown language', { ...good, language: 'fr' }],
    ['a short message', { ...good, message: 'too short' }],
    ['a long message', { ...good, message: 'x'.repeat(5001) }],
    ['a long address', { ...good, email: `${'x'.repeat(250)}@example.com` }],
  ])('rejects %s', (_label, input) => {
    expect(validate(input)).toBeNull();
  });

  it.each([
    'plain',
    'no@tld',
    'two@@example.com',
    'a b@example.com',
    'a@example.com\nBcc: x@example.com',
    'a@example.com, b@example.com',
    'Ada <a@example.com>',
    'a@example.c',
  ])('rejects the address %j', (email) => {
    expect(validate({ ...good, email })).toBeNull();
  });
});
