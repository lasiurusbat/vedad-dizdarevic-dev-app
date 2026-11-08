export const TYPES = ['job', 'freelance', 'other'] as const;
export const LANGUAGES = ['en', 'de'] as const;

export type ContactType = (typeof TYPES)[number];
export type Language = (typeof LANGUAGES)[number];

export interface ContactMessage {
  name: string;
  email: string;
  type: ContactType;
  language: Language;
  message: string;
}

const NAME_MAX = 100;
const EMAIL_MAX = 254;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;

// One address, nothing that could end it or add another. Deliberately not a full RFC parser.
const EMAIL = /^[^\s@<>()[\]",;:\\]+@[^\s@<>()[\]",;:\\]+\.[^\s@<>()[\]",;:\\.]{2,}$/;
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
