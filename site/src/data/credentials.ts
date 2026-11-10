/**
 * Certifications and diplomas shown in the Skills section. Claims plus a verification link, never
 * the certificate files themselves (the diploma prints a date of birth, and this repo is public).
 *
 * Titles and issuers are proper names, so they are not translated. Labels live in `i18n/`.
 *
 * AWS badge: the official emblem may only be shown by people who hold the certification. When the
 * exam is passed, download the badge from Credly, put it in `src/assets/credentials/`, import it
 * here as `badge`, and flip `status` to 'earned' with the issue date and Credly URL.
 */
import type { ImageMetadata } from 'astro';

export interface Credential {
  id: string;
  title: string;
  issuer: string;
  status: 'earned' | 'in-progress';
  /** ISO date (YYYY-MM-DD); only for earned credentials. */
  issued?: string;
  /** Public verification page. Checked 2026-11-04: shows name, document title and issue date only. */
  verifyUrl?: string;
  /** Official badge, only once earned. */
  badge?: ImageMetadata;
}

export const credentials: Credential[] = [
  {
    id: 'aws-saa',
    title: 'AWS Certified Solutions Architect – Associate',
    issuer: 'Amazon Web Services',
    status: 'in-progress',
  },
  {
    id: 'datascientest-devops',
    title: 'DevOps Engineer (diploma)',
    issuer: 'DataScientest',
    status: 'earned',
    issued: '2024-07-23',
    verifyUrl:
      'https://document-factory.datascientest.com/verify/4f75a618-8b74-4aff-9899-a807efeb870e',
  },
  {
    id: 'udemy-docker-k8s',
    title: 'Docker & Kubernetes: The Practical Guide',
    issuer: 'Udemy',
    status: 'earned',
    issued: '2026-09-16',
    verifyUrl: 'https://www.udemy.com/certificate/UC-409a5c62-6975-4f5e-8261-7cca40522b39/',
  },
];
