import { MarkerType, type Edge } from '@xyflow/react';
import { icons } from './icons';
import type { DiagramDefinition, DiagramNode } from './types';

const W = 160;
const H = 56;
const GROUP = 'aws';

/** Service node. Positions inside the AWS group are relative to the group. */
const svc = (
  id: string,
  x: number,
  y: number,
  label: string,
  kind: 'edge' | 'compute' | 'data' | 'mail' | 'security' | 'delivery' | 'external',
  detail?: string,
  inGroup = true,
  icon?: string,
): DiagramNode => ({
  id,
  type: 'service',
  position: { x, y },
  width: W,
  height: H,
  data: { label, detail, kind, icon },
  draggable: false,
  selectable: false,
  focusable: false,
  ...(inGroup ? { parentId: GROUP, extent: 'parent' as const } : {}),
});

export const nodes: DiagramNode[] = [
  svc('users', 400, 0, 'Visitors', 'external', undefined, false),
  svc('cf', 400, 80, 'Cloudflare', 'edge', 'proxy, TLS, WAF', false),
  svc('cust', 20, 90, 'Customer email', 'external', undefined, false),
  {
    id: GROUP,
    type: 'group',
    position: { x: 0, y: 170 },
    width: 790,
    height: 450,
    data: { label: 'AWS eu-central-1' },
    draggable: false,
    selectable: false,
    focusable: false,
  },
  svc('sns', 210, 40, 'SNS', 'mail', 'signed webhook', true, icons.sns),
  svc('alb', 400, 40, 'ALB', 'edge', 'Cloudflare only', true, icons.elb),
  svc('ses', 210, 150, 'SES', 'mail', 'mail in and out', true, icons.ses),
  svc('task', 400, 150, 'Fargate task', 'compute', 'nginx + Bun', true, icons.fargate),
  svc('ecr', 590, 150, 'ECR', 'delivery', 'immutable tags', true, icons.ecr),
  svc('s3mail', 20, 260, 'S3 inbound mail', 'data', 'own KMS key', true, icons.s3),
  svc('s3att', 400, 260, 'S3 attachments', 'data', 'scan before read', true, icons.s3),
  svc('rds', 590, 260, 'RDS', 'data', 'primary, zone A', true, icons.rds),
  svc('gd', 400, 370, 'GuardDuty', 'security', 'malware scan', true, icons.guardduty),
  svc('standby', 590, 370, 'RDS standby', 'data', 'zone B, failover', true, icons.rds),
  svc('gha', 840, 320, 'GitHub Actions', 'delivery', 'OIDC, no keys', false),
  svc('tag', 840, 230, 'git tag', 'delivery', 'full checks first', false),
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
  e('e8', 'ses', 'b', 's3mail', 'r', 'inbound'),
  e('e9', 'task', 'b', 's3att', 't'),
  e('e10', 'gd', 't', 's3att', 'b', 'scan'),
  e('e11', 'task', 'r', 'rds', 't', '5432'),
  e('e12', 'rds', 'b', 'standby', 't', 'sync'),
  e('e13', 'ecr', 'l', 'task', 'r'),
  e('e14', 'tag', 'b', 'gha', 't'),
  e('e15', 'gha', 'l', 'ecr', 'r', 'push'),
];

export const sortedProduction: DiagramDefinition = {
  id: 'sorted-production',
  nodes,
  edges,
  description: {
    en: [
      'Visitors reach Cloudflare, which forwards HTTPS to an application load balancer in AWS eu-central-1 that only accepts Cloudflare addresses.',
      'The load balancer sends requests to one Fargate task running nginx and the Bun server, which talks to a private RDS PostgreSQL database with a synchronous standby in a second zone.',
      'Customer email arrives at SES, is stored in an S3 bucket with its own KMS key, and notifies SNS, which calls a signed webhook on the load balancer. The task sends replies through SES.',
      'Attachments go to a second S3 bucket that GuardDuty scans; nothing can be read until the scan marks it clean.',
      'A git tag in GitHub Actions runs the checks and pushes an immutable image to ECR using an OIDC role without stored keys. ECS pulls that image when it starts a task.',
    ],
    de: [
      'Besucher erreichen Cloudflare, das HTTPS an einen Application Load Balancer in AWS eu-central-1 weiterleitet. Der Load Balancer akzeptiert nur Cloudflare-Adressen.',
      'Der Load Balancer leitet Anfragen an einen Fargate-Task mit nginx und dem Bun-Server weiter. Dieser spricht mit einer privaten RDS-PostgreSQL-Datenbank, deren synchrone Standby-Instanz in einer zweiten Zone läuft.',
      'Kunden-E-Mails kommen bei SES an, landen in einem S3-Bucket mit eigenem KMS-Schlüssel und benachrichtigen SNS, das einen signierten Webhook am Load Balancer aufruft. Antworten verschickt der Task über SES.',
      'Anhänge gehen in einen zweiten S3-Bucket, den GuardDuty scannt. Gelesen werden kann erst, wenn der Scan die Datei als sauber markiert hat.',
      'Ein Git-Tag startet in GitHub Actions die Prüfungen und lädt ein unveränderliches Image über eine OIDC-Rolle ohne gespeicherte Schlüssel in ECR hoch. ECS holt dieses Image beim Start eines Tasks.',
    ],
  },
};
