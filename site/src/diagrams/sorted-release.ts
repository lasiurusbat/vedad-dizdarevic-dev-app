import { MarkerType, type Edge } from '@xyflow/react';
import { githubMark, icons } from './icons';
import type { DiagramDefinition, DiagramIcon, DiagramNode, ServiceData } from './types';

// "How a release gets there" from the Sorted architecture doc: the app repo builds an immutable
// image, the infra repo deploys it with a reviewed Terraform change. Two rows, AWS on the right.
const W = 190;
const H = 56;
const GROUP = 'aws';
const COL = [0, 310, 620];
const ROW = { app: 50, infra: 230 };

const svc = (
  id: string,
  x: number,
  y: number,
  label: string,
  kind: ServiceData['kind'],
  detail: string,
  icon: DiagramIcon,
  inGroup = false,
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
  svc('tag', COL[0]!, ROW.app, 'git tag v1.0.0', 'delivery', 'app repo', githubMark),
  svc(
    'checks',
    COL[1]!,
    ROW.app,
    'Full checks',
    'delivery',
    'types, lint, unit, 6-shard e2e',
    githubMark,
  ),
  svc('build', COL[2]!, ROW.app, 'Build images', 'delivery', 'arm64, dev + prod', githubMark),
  svc('pr', COL[0]!, ROW.infra, 'image_tag = v1.0.0', 'delivery', 'infra repo PR', githubMark),
  svc('validate', COL[1]!, ROW.infra, 'Validate', 'delivery', 'fmt, validate, tf test', githubMark),
  svc('plan', COL[2]!, ROW.infra, 'terraform plan', 'security', 'in the run summary', githubMark),
  {
    id: GROUP,
    type: 'group',
    position: { x: 940, y: 0 },
    width: 250,
    height: 320,
    data: { label: 'AWS eu-central-1' },
    draggable: false,
    selectable: false,
    focusable: false,
  },
  svc('ecr', 30, ROW.app, 'ECR', 'delivery', 'immutable tags', icons.ecr, true),
  svc(
    'ecs',
    30,
    ROW.infra,
    'ECS on Fargate',
    'compute',
    'rolling, auto rollback',
    icons.fargate,
    true,
  ),
];

const arrow = { type: MarkerType.ArrowClosed, color: '#8b95a0' } as const;
const e = (
  id: string,
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
  label?: string,
  className?: string,
): Edge => ({
  id,
  source,
  sourceHandle,
  target,
  targetHandle,
  label,
  className,
  type: 'smoothstep',
  markerEnd: arrow,
  focusable: false,
  selectable: false,
});

export const edges: Edge[] = [
  e('r1', 'tag', 'r', 'checks', 'l'),
  e('r2', 'checks', 'r', 'build', 'l', 'only if green'),
  e('r3', 'build', 'r', 'ecr', 'l', 'OIDC, push only'),
  e('r4', 'pr', 'r', 'validate', 'l'),
  e('r5', 'validate', 'r', 'plan', 'l', 'manual run, approval'),
  e('r6', 'plan', 'r', 'ecs', 'l', 'apply that plan'),
  e('r7', 'ecr', 'b', 'ecs', 't', 'pulled at task start', 'vdd-edge-dashed'),
];

export const sortedRelease: DiagramDefinition = {
  id: 'sorted-release',
  nodes,
  edges,
  padding: 0.04,
  controlsHorizontal: true,
  description: {
    en: [
      'A release starts as a git tag, for example v1.0.0, in the application repository.',
      'GitHub Actions runs the full checks first: type checks, lint, unit tests and the end-to-end suite in six shards. A tag that fails is never released.',
      'Only then does it build arm64 images for dev and prod and push them to ECR through an OIDC role that can push images and nothing else. ECR tags are immutable, so a version always means the same image.',
      'Deploying is a pull request in the infrastructure repository that sets image_tag to the new version. CI runs terraform fmt, validate and the offline Terraform tests.',
      'A manual run with environment approval writes the Terraform plan into the run summary and applies exactly that saved plan.',
      'ECS rolls out the new task definition with the deployment circuit breaker and automatic rollback; the tasks pull the image from ECR when they start. Rolling back means setting the previous tag.',
    ],
    de: [
      'Ein Release beginnt als Git-Tag, zum Beispiel v1.0.0, im Anwendungs-Repository.',
      'GitHub Actions führt zuerst alle Prüfungen aus: Typprüfung, Lint, Unit-Tests und die End-to-End-Suite in sechs Shards. Ein Tag, der durchfällt, wird nie veröffentlicht.',
      'Erst dann baut es arm64-Images für Dev und Prod und lädt sie über eine OIDC-Rolle, die nur Images hochladen darf, in ECR hoch. ECR-Tags sind unveränderlich, eine Version bedeutet also immer dasselbe Image.',
      'Das Deployment ist ein Pull Request im Infrastruktur-Repository, der image_tag auf die neue Version setzt. Die CI führt terraform fmt, validate und die Offline-Terraform-Tests aus.',
      'Ein manueller Lauf mit Freigabe der Umgebung schreibt den Terraform-Plan in die Zusammenfassung des Laufs und wendet genau diesen gespeicherten Plan an.',
      'ECS rollt die neue Task-Definition mit Deployment Circuit Breaker und automatischem Rollback aus; die Tasks holen das Image beim Start aus ECR. Zurückrollen heißt, den vorherigen Tag zu setzen.',
    ],
  },
};
