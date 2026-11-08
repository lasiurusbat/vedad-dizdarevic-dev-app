import { MarkerType, type Edge } from '@xyflow/react';
import { cloudflareLogo, genericIcons, githubMark, icons } from './icons';
import type { DiagramDefinition, DiagramIcon, DiagramNode, ServiceData } from './types';

const W = 160;
const H = 56;
const AWS = 'aws';

/** Service node. Positions are relative to the parent group, if any. The Worker and Lambda have no
 * official icon in the repo, so they show text only (no invented symbols). */
const svc = (
  id: string,
  x: number,
  y: number,
  label: string,
  kind: ServiceData['kind'],
  detail?: string,
  parent?: string,
  icon?: DiagramIcon,
  logo?: string,
): DiagramNode => ({
  id,
  type: 'service',
  position: { x, y },
  width: W,
  height: H,
  data: { label, detail, kind, icon, logo },
  draggable: false,
  selectable: false,
  focusable: false,
  ...(parent ? { parentId: parent, extent: 'parent' as const } : {}),
});

// Layout: requests run left to right through the middle row (visitors, Cloudflare, the Worker, the
// bucket). Deploys sit above and come down into the Worker and the bucket. Inside the Region, the
// contact path runs from the Worker down to Lambda and SES, out to the inbox on the right;
// the alarms sit below it and reach the same inbox through SNS.
export const nodes: DiagramNode[] = [
  svc('push', 0, 0, 'Push to main', 'delivery', 'after the PR checks', undefined, githubMark),
  svc('gha', 480, 0, 'Deploy workflow', 'delivery', 'OIDC role, no keys', undefined, githubMark),
  svc('users', 0, 170, 'Visitors', 'external', undefined, undefined, genericIcons.users),
  svc(
    'cf',
    240,
    170,
    'Cloudflare',
    'edge',
    'DNS, TLS, edge cache',
    undefined,
    undefined,
    cloudflareLogo,
  ),
  svc('worker', 480, 170, 'Worker', 'edge', 'signs requests, sets headers'),

  {
    id: AWS,
    type: 'group',
    position: { x: 720, y: 80 },
    width: 520,
    height: 400,
    data: { label: 'AWS eu-central-1', variant: 'cloud' },
    draggable: false,
    selectable: false,
    focusable: false,
  },
  svc('s3', 40, 90, 'S3 site bucket', 'data', 'private, versioned', AWS, icons.s3),
  svc('lambda', 40, 210, 'Lambda (contact)', 'compute', 'IAM-signed URL', AWS),
  svc('ses', 300, 210, 'SES', 'mail', 'sends the message', AWS, icons.ses),
  svc('cw', 40, 310, 'CloudWatch alarms', 'security', 'errors, bounces', AWS, icons.cloudwatch),
  svc('sns', 300, 310, 'SNS', 'mail', 'alert email', AWS, icons.sns),

  svc('inbox', 1300, 290, 'Inbox', 'external', 'hello@, Purelymail', undefined, genericIcons.email),
];

const arrow = { type: MarkerType.ArrowClosed, color: '#8b95a0' } as const;
const e = (
  id: string,
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
  label?: string,
): Edge => ({
  id,
  source,
  sourceHandle,
  target,
  targetHandle,
  label,
  type: 'smoothstep',
  markerEnd: arrow,
  focusable: false,
  selectable: false,
});

export const edges: Edge[] = [
  e('q1', 'users', 'r', 'cf', 'l', 'HTTPS'),
  e('q2', 'cf', 'r', 'worker', 'l'),
  e('q3', 'worker', 'r', 's3', 'l', 'SigV4'),
  e('c1', 'worker', 'b', 'lambda', 'l', 'SigV4'),
  e('c2', 'lambda', 'r', 'ses', 'l'),
  e('c3', 'ses', 'r', 'inbox', 'l'),
  e('a1', 'lambda', 'b', 'cw', 't'),
  e('a2', 'cw', 'r', 'sns', 'l'),
  e('a3', 'sns', 'r', 'inbox', 'b', 'alerts'),
  e('d1', 'push', 'r', 'gha', 'l'),
  e('d2', 'gha', 'b', 'worker', 't', 'wrangler'),
  e('d3', 'gha', 'r', 's3', 't', 'sync'),
];

export const sitePlatform: DiagramDefinition = {
  id: 'site-platform',
  nodes,
  edges,
  // The Worker, where requests, deploys and the contact path meet.
  focusNode: 'worker',
  paths: [
    {
      id: 'request',
      label: { en: 'Requests', de: 'Anfragen' },
      summary: {
        en: 'Cloudflare terminates TLS and serves from its edge cache. On a miss, the Worker signs a request to the private bucket in Frankfurt, maps clean URLs to pages and adds the security headers.',
        de: 'Cloudflare terminiert TLS und liefert aus dem Edge-Cache. Fehlt eine Seite dort, signiert der Worker eine Anfrage an den privaten Bucket in Frankfurt, löst saubere URLs zu Seiten auf und setzt die Security-Header.',
      },
      nodes: ['users', 'cf', 'worker', 's3'],
      edges: ['q1', 'q2', 'q3'],
      focus: 'worker',
    },
    {
      id: 'contact',
      label: { en: 'Contact and alerts', de: 'Kontakt und Alarme' },
      summary: {
        en: 'The Worker checks the origin, the size and the Turnstile token, then forwards the form to a Lambda function URL that only accepts IAM-signed calls. Lambda sends it with SES to the hello@ inbox; alarms on Lambda and SES reach the same inbox through SNS.',
        de: 'Der Worker prüft Origin, Größe und Turnstile-Token und leitet das Formular dann an eine Lambda-Function-URL weiter, die nur IAM-signierte Aufrufe annimmt. Lambda verschickt es über SES an das Postfach hello@; Alarme auf Lambda und SES erreichen dasselbe Postfach über SNS.',
      },
      nodes: ['worker', 'lambda', 'ses', 'inbox', 'cw', 'sns'],
      edges: ['c1', 'c2', 'c3', 'a1', 'a2', 'a3'],
      focus: 'lambda',
    },
    {
      id: 'deploy',
      label: { en: 'Deploys', de: 'Deploys' },
      summary: {
        en: 'A push to main assumes an AWS role through OIDC, uploads the build to the bucket (hashed assets first), deploys the Worker with Wrangler, purges the cache and smoke-tests the live domain.',
        de: 'Ein Push auf main übernimmt per OIDC eine AWS-Rolle, lädt den Build in den Bucket (gehashte Assets zuerst), deployt den Worker mit Wrangler, leert den Cache und prüft die Live-Domain mit einem Smoke-Test.',
      },
      nodes: ['push', 'gha', 'worker', 's3'],
      edges: ['d1', 'd2', 'd3'],
      focus: 'gha',
    },
  ],
  description: {
    en: [
      'Visitors reach vedad-dizdarevic.dev through Cloudflare, which handles DNS and TLS and serves cached pages from its edge.',
      'On a cache miss, a Cloudflare Worker signs a request with AWS Signature Version 4 to a private S3 bucket in eu-central-1, maps clean URLs to pages and adds the security headers to every response.',
      'The Worker checks the contact form, then forwards it to a Lambda function URL that only accepts IAM-signed calls; Lambda sends the message with SES to the hello@ inbox. CloudWatch alarms on Lambda and SES send alerts through SNS to the same inbox.',
      'A push to main runs the deploy workflow in GitHub Actions. It assumes an AWS role through OIDC, uploads the build to the bucket, deploys the Worker with Wrangler, purges the cache and smoke-tests the live site.',
    ],
    de: [
      'Besucher erreichen vedad-dizdarevic.dev über Cloudflare, das DNS und TLS übernimmt und zwischengespeicherte Seiten vom Edge ausliefert.',
      'Fehlt eine Seite im Cache, signiert ein Cloudflare Worker eine Anfrage mit AWS Signature Version 4 an einen privaten S3-Bucket in eu-central-1, löst saubere URLs zu Seiten auf und setzt die Security-Header auf jede Antwort.',
      'Der Worker prüft das Kontaktformular und leitet es an eine Lambda-Function-URL weiter, die nur IAM-signierte Aufrufe annimmt; Lambda verschickt die Nachricht über SES an das Postfach hello@. CloudWatch-Alarme auf Lambda und SES schicken Warnungen über SNS an dasselbe Postfach.',
      'Ein Push auf main startet den Deploy-Workflow in GitHub Actions. Er übernimmt per OIDC eine AWS-Rolle, lädt den Build in den Bucket, deployt den Worker mit Wrangler, leert den Cache und prüft die Live-Site mit einem Smoke-Test.',
    ],
  },
};
