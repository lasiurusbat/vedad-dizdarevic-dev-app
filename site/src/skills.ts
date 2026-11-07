/**
 * Skills in the Skills section, grouped by area, platform first and the application stack last
 * (the site sells Cloud & DevOps work). Source: the Technical Skills block of the owner's CV
 * (`cv/reference/`, October 2026); add nothing that is not there. No bars or percentages.
 *
 * Tool names are proper names and stay as they are; a `{ en, de }` item is for the few that carry
 * words. Phase 5 may move this into `cv/data.yaml` so the CV and the site share one source.
 */
import type { Locale } from './i18n';

type Text = string | Record<Locale, string>;

export interface SkillGroup {
  id: string;
  title: Record<Locale, string>;
  items: Text[];
}

export const skillGroups: SkillGroup[] = [
  {
    id: 'cloud',
    title: { en: 'Cloud (AWS)', de: 'Cloud (AWS)' },
    items: [
      'ECS/Fargate',
      'ECR',
      'RDS',
      'ALB',
      'VPC',
      { en: 'IAM (OIDC, least privilege)', de: 'IAM (OIDC, Least Privilege)' },
      'S3',
      'KMS',
      'Secrets Manager',
      'SES',
      'SNS',
      'EventBridge',
      'CloudWatch',
      'Elastic Beanstalk',
      'EKS',
    ],
  },
  {
    id: 'iac',
    title: { en: 'Infrastructure as code', de: 'Infrastructure as Code' },
    items: [
      'Terraform',
      { en: 'Modules', de: 'Module' },
      { en: 'Multi-environment', de: 'Mehrere Umgebungen' },
      { en: 'Multi-region', de: 'Mehrere Regionen' },
      { en: 'S3 remote state', de: 'S3 Remote State' },
      { en: 'Terraform tests', de: 'Terraform-Tests' },
    ],
  },
  {
    id: 'cicd',
    title: { en: 'CI/CD', de: 'CI/CD' },
    items: [
      'GitHub Actions',
      { en: 'OIDC to AWS', de: 'OIDC zu AWS' },
      { en: 'Release tagging', de: 'Release-Tags' },
      { en: 'Build matrix', de: 'Build-Matrix' },
      'GitLab CI/CD',
    ],
  },
  {
    id: 'containers',
    title: { en: 'Containers and orchestration', de: 'Container und Orchestrierung' },
    items: [
      { en: 'Docker (multi-stage builds)', de: 'Docker (Multi-Stage-Builds)' },
      'Docker Compose',
      'nginx',
      'Kubernetes (EKS)',
      'ArgoCD (GitOps)',
    ],
  },
  {
    id: 'observability',
    title: { en: 'Monitoring and observability', de: 'Monitoring und Observability' },
    items: ['Prometheus', 'Grafana', 'Splunk', 'Fluent Bit', 'CloudWatch Logs', 'Sentry'],
  },
  {
    id: 'linux',
    title: { en: 'Linux and scripting', de: 'Linux und Scripting' },
    items: [
      { en: 'Linux administration (certified)', de: 'Linux-Administration (zertifiziert)' },
      'Bash',
      'Python',
      'WSL2/Ubuntu',
    ],
  },
  {
    id: 'app',
    title: { en: 'Application stack', de: 'Anwendungs-Stack' },
    items: [
      'TypeScript',
      'Node.js/Bun',
      'Express',
      'React',
      'FastAPI',
      'SQLAlchemy',
      'PostgreSQL (RDS, Prisma)',
      'MongoDB',
    ],
  },
  {
    id: 'work',
    title: { en: 'Ways of working', de: 'Arbeitsweise' },
    items: ['Git', 'GitHub', 'GitLab', 'Agile (Scrum, Kanban)', 'Jira'],
  },
];

export function text(value: Text, locale: Locale): string {
  return typeof value === 'string' ? value : value[locale];
}
