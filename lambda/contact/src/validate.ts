import {
  EMAIL,
  EMAIL_MAX,
  LANGUAGES,
  MESSAGE_MAX,
  MESSAGE_MIN,
  NAME_MAX,
  TYPES,
  type ContactMessage,
} from '@vdd/contact-schema';

export type { ContactMessage };

// Line breaks and other control characters, which have no place in a name or a mail header.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;
// Keeps tabs and line breaks in the message; everything else below 0x20 goes.
// eslint-disable-next-line no-control-regex
const MESSAGE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

function includes<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

/** Returns the cleaned message, or null if anything is wrong. Callers only need to know that. */
export function validate(input: unknown): ContactMessage | null {
  if (typeof input !== 'object' || input === null) return null;
  const { name, email, type, language, message } = input as Record<string, unknown>;
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
    return null;
  }
  if (!includes(TYPES, type) || !includes(LANGUAGES, language)) return null;

  const cleanName = name.trim();
  const cleanEmail = email.trim();
  const cleanMessage = message.replace(MESSAGE_CONTROL, '').trim();

  if (cleanName.length === 0 || cleanName.length > NAME_MAX || CONTROL.test(cleanName)) return null;
  if (cleanEmail.length > EMAIL_MAX || !EMAIL.test(cleanEmail)) return null;
  if (cleanMessage.length < MESSAGE_MIN || cleanMessage.length > MESSAGE_MAX) return null;

  return { name: cleanName, email: cleanEmail, type, language, message: cleanMessage };
}
