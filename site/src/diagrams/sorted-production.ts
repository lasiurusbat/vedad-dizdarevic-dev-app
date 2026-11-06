import { MarkerType, type Edge } from '@xyflow/react';
import { cloudflareLogo, genericIcons, githubMark, icons } from './icons';
import type { DiagramDefinition, DiagramIcon, DiagramNode } from './types';

const W = 160;
const H = 56;
const AWS = 'aws';
const VPC = 'vpc';
const PUBLIC = 'public';
const PRIVATE = 'private';

/** Service node. Positions are relative to the parent group, if any. */
const svc = (
  id: string,
  x: number,
  y: number,
  label: string,
  kind: 'edge' | 'compute' | 'data' | 'mail' | 'security' | 'delivery' | 'external',
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

/** A box around other nodes. Parents must come before their children in the array. */
const group = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  variant: 'cloud' | 'vpc' | 'public' | 'private',
  parent?: string,
): DiagramNode => ({
  id,
  type: 'group',
  position: { x, y },
  width,
  height,
  data: { label, variant },
  className: variant === 'cloud' ? undefined : `vdd-group-${variant}`,
  draggable: false,
  selectable: false,
  focusable: false,
  ...(parent ? { parentId: parent, extent: 'parent' as const } : {}),
});

// Layout: the Region holds the VPC in the middle; regional services that do not live in a subnet
// (SES, SNS, S3, ECR, GuardDuty) sit outside it, mail on the left, scanning and delivery on the
// right. Inside the VPC the ALB is in the public subnets, straight above the task; the task and
// the database (primary in zone A, standby in zone B) are in the private subnets. Every line into
// the task is straight: ALB from above, SES on the left, ECR on the right, RDS below.
export const nodes: DiagramNode[] = [
  svc('users', 440, 0, 'Visitors', 'external', undefined, undefined, genericIcons.users),
  svc('cf', 440, 80, 'Cloudflare', 'edge', 'proxy, TLS, WAF', undefined, undefined, cloudflareLogo),
  svc('cust', 20, 90, 'Customer email', 'external', undefined, undefined, genericIcons.email),
  svc('tag', 1160, 325, 'git tag', 'delivery', 'full checks first', undefined, githubMark),
  svc('gha', 1160, 435, 'GitHub Actions', 'delivery', 'OIDC, no keys', undefined, githubMark),

  group(AWS, 0, 170, 1110, 520, 'AWS eu-central-1', 'cloud'),
  svc('sns', 200, 115, 'SNS', 'mail', 'signed webhook', AWS, icons.sns),
  svc('ses', 200, 265, 'SES', 'mail', 'mail in and out', AWS, icons.ses),
  svc('s3mail', 200, 390, 'S3 inbound mail', 'data', 'own KMS key', AWS, icons.s3),
  svc('ecr', 920, 265, 'ECR', 'delivery', 'immutable tags', AWS, icons.ecr),
  svc('s3att', 920, 140, 'S3 attachments', 'data', 'scan before read', AWS, icons.s3),
  svc('gd', 920, 15, 'GuardDuty', 'security', 'malware scan', AWS, icons.guardduty),

  group(VPC, 400, 40, 480, 450, 'VPC, two availability zones', 'vpc', AWS),
  group(PUBLIC, 20, 40, 440, 110, 'Public subnets', 'public', VPC),
  svc('alb', 20, 35, 'ALB', 'edge', 'Cloudflare only', PUBLIC, icons.elb),
  group(
    PRIVATE,
    20,
    180,
    440,
    250,
    'Private subnets, no inbound from the internet',
    'private',
    VPC,
  ),
  svc('task', 20, 45, 'Fargate task', 'compute', 'nginx + Bun', PRIVATE, icons.fargate),
  svc('rds', 20, 160, 'RDS', 'data', 'primary, zone A', PRIVATE, icons.rds),
  svc('standby', 260, 160, 'RDS standby', 'data', 'zone B, failover', PRIVATE, icons.rds),
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
  e('e1', 'users', 'b', 'cf', 't'),
  e('e2', 'cf', 'b', 'alb', 't', 'HTTPS'),
  e('e3', 'alb', 'b', 'task', 't'),
  e('e4', 'cust', 'b', 'ses', 'l'),
  e('e5', 'ses', 't', 'sns', 'b', 'events'),
  e('e6', 'sns', 'r', 'alb', 'l'),
  e('e7', 'task', 'l', 'ses', 'r'),
  e('e8', 'ses', 'b', 's3mail', 't', 'inbound'),
  e('e9', 'task', 'r', 's3att', 'l'),
  e('e10', 'gd', 'b', 's3att', 't', 'scan'),
  e('e11', 'task', 'b', 'rds', 't', '5432'),
  e('e12', 'rds', 'r', 'standby', 'l', 'sync'),
  e('e13', 'ecr', 'l', 'task', 'r'),
  e('e14', 'tag', 'b', 'gha', 't'),
  e('e15', 'gha', 'l', 'ecr', 'r', 'push'),
];

export const sortedProduction: DiagramDefinition = {
  id: 'sorted-production',
  nodes,
  edges,
  // The request path (Visitors, Cloudflare, ALB, task, RDS) runs down the middle.
  focusNode: 'cf',
  paths: [
    {
      id: 'request',
      label: { en: 'Requests', de: 'Anfragen' },
      summary: {
        en: 'A request passes Cloudflare, then the ALB with an ACM certificate, which accepts only Cloudflare’s ranges, then nginx and the Bun server in one Fargate task, which reads and writes RDS PostgreSQL in the private subnets.',
        de: 'Eine Anfrage läuft durch Cloudflare, dann zum ALB mit ACM-Zertifikat, der nur Cloudflare-Bereiche annimmt, dann zu nginx und dem Bun-Server in einem Fargate-Task, der in den privaten Subnetzen mit RDS PostgreSQL arbeitet.',
      },
      nodes: ['users', 'cf', 'alb', 'task', 'rds', 'standby'],
      edges: ['e1', 'e2', 'e3', 'e11', 'e12'],
      focus: 'cf',
    },
    {
      id: 'mail',
      label: { en: 'Mail', de: 'Mail' },
      summary: {
        en: 'Customer email reaches an SES receipt rule, which stores it in S3 under its own KMS key and notifies SNS. SNS calls a signed webhook on the ALB; the task saves a ticket, queues a pg-boss job for AI classification, then routes it to the agent queue or sends an automatic reply through SES. Delivery events come back through SNS. Attachments stay unreadable until GuardDuty marks them clean.',
        de: 'Kunden-E-Mails treffen auf eine SES-Empfangsregel, die sie in S3 mit eigenem KMS-Schlüssel ablegt und SNS benachrichtigt. SNS ruft einen signierten Webhook am ALB auf; der Task speichert ein Ticket, legt einen pg-boss-Job für die KI-Klassifizierung an und leitet es dann in die Warteschlange der Agents oder schickt eine automatische Antwort über SES. Zustellereignisse kommen über SNS zurück. Anhänge bleiben unlesbar, bis GuardDuty sie als sauber markiert.',
      },
      nodes: ['cust', 'ses', 's3mail', 'sns', 'alb', 'task', 's3att', 'gd'],
      edges: ['e4', 'e8', 'e5', 'e6', 'e3', 'e7', 'e9', 'e10'],
      focus: 'ses',
    },
    {
      id: 'release',
      label: { en: 'Releases', de: 'Releases' },
      summary: {
        en: 'A git tag runs the full checks in GitHub Actions, which pushes an immutable image to ECR through an OIDC role with no stored keys. ECS pulls that image when it starts the task.',
        de: 'Ein Git-Tag startet die vollständigen Prüfungen in GitHub Actions, das über eine OIDC-Rolle ohne gespeicherte Schlüssel ein unveränderliches Image nach ECR schiebt. ECS holt dieses Image, wenn es den Task startet.',
      },
      nodes: ['tag', 'gha', 'ecr', 'task'],
      edges: ['e14', 'e15', 'e13'],
      focus: 'ecr',
    },
  ],
  description: {
    en: [
      'Visitors reach Cloudflare, which forwards HTTPS to an application load balancer in AWS eu-central-1. The load balancer sits in the public subnets of a VPC that spans two availability zones, and only accepts Cloudflare addresses.',
      'The load balancer sends requests to one Fargate task running nginx and the Bun server. The task and the RDS PostgreSQL database are in the private subnets, with no inbound path from the internet; the database has a synchronous standby in the second zone.',
      'Customer email arrives at SES, is stored in an S3 bucket with its own KMS key, and notifies SNS, which calls a signed webhook on the load balancer. The task sends replies through SES.',
      'Attachments go to a second S3 bucket that GuardDuty scans; nothing can be read until the scan marks it clean.',
      'A git tag in GitHub Actions runs the checks and pushes an immutable image to ECR using an OIDC role without stored keys. ECS pulls that image when it starts a task.',
    ],
    de: [
      'Besucher erreichen Cloudflare, das HTTPS an einen Application Load Balancer in AWS eu-central-1 weiterleitet. Der Load Balancer liegt in den öffentlichen Subnetzen einer VPC über zwei Availability Zones und akzeptiert nur Cloudflare-Adressen.',
      'Der Load Balancer leitet Anfragen an einen Fargate-Task mit nginx und dem Bun-Server weiter. Task und RDS-PostgreSQL-Datenbank liegen in den privaten Subnetzen, ohne eingehenden Weg aus dem Internet; die synchrone Standby-Instanz der Datenbank läuft in der zweiten Zone.',
      'Kunden-E-Mails kommen bei SES an, landen in einem S3-Bucket mit eigenem KMS-Schlüssel und benachrichtigen SNS, das einen signierten Webhook am Load Balancer aufruft. Antworten verschickt der Task über SES.',
      'Anhänge gehen in einen zweiten S3-Bucket, den GuardDuty scannt. Gelesen werden kann erst, wenn der Scan die Datei als sauber markiert hat.',
      'Ein Git-Tag startet in GitHub Actions die Prüfungen und lädt ein unveränderliches Image über eine OIDC-Rolle ohne gespeicherte Schlüssel in ECR hoch. ECS holt dieses Image beim Start eines Tasks.',
    ],
  },
};
