/**
 * The contact form's contract, shared by the form (site), the Worker and the Lambda, so a limit or
 * a field changes in one place. TypeScript source with no dependencies: each consumer bundles it.
 * The Lambda's `validate()` applies these and has the last word.
 */
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

/** The fields the Worker forwards to the Lambda: never the token or anything else that was posted. */
export const FIELDS = [
  'name',
  'email',
  'type',
  'language',
  'message',
] as const satisfies readonly (keyof ContactMessage)[];

export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 5000;

// One address, nothing that could end it or add another. Deliberately not a full RFC parser.
export const EMAIL = /^[^\s@<>()[\]",;:\\]+@[^\s@<>()[\]",;:\\]+\.[^\s@<>()[\]",;:\\.]{2,}$/;
