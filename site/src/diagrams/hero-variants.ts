// Made-up AWS architectures for the hero graphic (HeroArchitecture.astro). Not real systems; the
// case studies hold those. All three share the frame: viewBox 840 x 560, a VPC with two
// Availability Zones as horizontal bands, a load balancer on the band boundary, four compute
// nodes at x 320, data stores at x 500, and managed services outside the VPC at x 725.
// Icons are the official AWS Architecture Icons, unmodified (see src/assets/aws-icons/README.md).
import { groupIcons, icons } from './icons';

export interface HeroNode {
  x: number;
  y: number;
  icon: string;
  label: string;
}

export interface HeroGroup {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  cls: 'vpc' | 'az' | 'inner';
  /** Label at the top-right instead of the top-left. */
  end?: boolean;
  /** Official group icon in the top-left corner (only where AWS publishes one). */
  icon?: string;
}

export interface HeroEdge {
  d: string;
  /** Animation delay class, so packets move through the system in order. */
  hop: 0 | 1 | 2 | 3;
}

export interface HeroVariant {
  id: 'fargate' | 'eks' | 'ec2';
  nodes: HeroNode[];
  groups: HeroGroup[];
  edges: HeroEdge[];
  /** Control-plane links: dashed, no packets. */
  watch: string[];
}

const vpcAndZones: HeroGroup[] = [
  { x: 110, y: 46, w: 520, h: 496, label: 'VPC', cls: 'vpc' },
  { x: 128, y: 74, w: 484, h: 220, label: 'Availability Zone A', cls: 'az', end: true },
  { x: 128, y: 310, w: 484, h: 220, label: 'Availability Zone B', cls: 'az', end: true },
];

// Load balancer to the four compute nodes, and on to the two data stores.
const computeEdges: HeroEdge[] = [
  { d: 'M0 302 H158', hop: 0 },
  { d: 'M202 302 H255 V140 H298', hop: 1 },
  { d: 'M202 302 H255 V235 H298', hop: 1 },
  { d: 'M202 302 H255 V380 H298', hop: 1 },
  { d: 'M202 302 H255 V475 H298', hop: 1 },
  { d: 'M342 140 H420 V188 H478', hop: 2 },
  { d: 'M342 235 H420 V188 H478', hop: 2 },
  { d: 'M342 380 H420 V428 H478', hop: 2 },
  { d: 'M342 475 H420 V428 H478', hop: 2 },
];

const lb: HeroNode = { x: 180, y: 302, icon: icons.elb, label: 'Load balancer' };
const compute = (icon: string, label: string): HeroNode[] =>
  [140, 235, 380, 475].map((y) => ({ x: 320, y, icon, label }));

// Box around the compute column, spanning both zones (an Auto Scaling or node group).
const computeBox = { x: 262, y: 88, w: 118, h: 440 } as const;

export const heroVariants: HeroVariant[] = [
  {
    id: 'fargate',
    nodes: [
      lb,
      ...compute(icons.fargate, 'Fargate task'),
      { x: 500, y: 188, icon: icons.rds, label: 'RDS primary' },
      { x: 500, y: 428, icon: icons.rds, label: 'RDS replica' },
      { x: 725, y: 80, icon: icons.ecr, label: 'ECR' },
      { x: 725, y: 185, icon: icons.s3, label: 'S3' },
      { x: 725, y: 290, icon: icons.sns, label: 'SNS' },
      { x: 725, y: 395, icon: icons.ses, label: 'SES' },
      { x: 725, y: 495, icon: icons.guardduty, label: 'GuardDuty' },
    ],
    groups: vpcAndZones,
    edges: [
      ...computeEdges,
      { d: 'M320 118 V60 H660 V185 H703', hop: 2 },
      { d: 'M342 245 H395 V302 H680 V290 H703', hop: 2 },
      { d: 'M522 188 H565 V428 H522', hop: 3 },
      { d: 'M747 290 H795 V395 H747', hop: 3 },
    ],
    watch: ['M703 80 H640 V140 H342', 'M703 495 H630'],
  },
  {
    id: 'eks',
    nodes: [
      lb,
      ...compute(icons.ec2, 'EKS node'),
      { x: 500, y: 188, icon: icons.rds, label: 'RDS' },
      { x: 500, y: 428, icon: icons.elasticache, label: 'ElastiCache' },
      { x: 725, y: 80, icon: icons.eks, label: 'EKS control plane' },
      { x: 725, y: 185, icon: icons.ecr, label: 'ECR' },
      { x: 725, y: 290, icon: icons.s3, label: 'S3' },
      { x: 725, y: 395, icon: icons.cloudwatch, label: 'CloudWatch' },
      { x: 725, y: 495, icon: icons.guardduty, label: 'GuardDuty' },
    ],
    groups: [...vpcAndZones, { ...computeBox, label: 'Managed node group', cls: 'inner' }],
    edges: [
      ...computeEdges,
      { d: 'M320 118 V60 H660 V290 H703', hop: 2 },
      { d: 'M342 245 H395 V302 H680 V395 H703', hop: 2 },
    ],
    watch: ['M703 80 H640 V140 H342', 'M703 185 H650 V250 H342', 'M703 495 H630'],
  },
  {
    id: 'ec2',
    nodes: [
      { x: 45, y: 302, icon: icons.route53, label: 'Route 53' },
      lb,
      ...compute(icons.ec2, 'EC2 instance'),
      { x: 500, y: 188, icon: icons.rds, label: 'RDS primary' },
      { x: 500, y: 428, icon: icons.rds, label: 'RDS replica' },
      { x: 725, y: 80, icon: icons.elasticache, label: 'ElastiCache' },
      { x: 725, y: 185, icon: icons.s3, label: 'S3' },
      { x: 725, y: 290, icon: icons.cloudwatch, label: 'CloudWatch' },
      { x: 725, y: 395, icon: icons.sns, label: 'SNS' },
      { x: 725, y: 495, icon: icons.guardduty, label: 'GuardDuty' },
    ],
    groups: [
      ...vpcAndZones,
      {
        ...computeBox,
        label: 'Auto Scaling group',
        cls: 'inner',
        icon: groupIcons.autoScalingGroup,
      },
    ],
    edges: [
      ...computeEdges,
      { d: 'M320 118 V60 H660 V80 H703', hop: 2 },
      { d: 'M342 245 H395 V302 H680 V290 H703', hop: 2 },
      { d: 'M522 188 H565 V428 H522', hop: 3 },
      { d: 'M747 290 H795 V395 H747', hop: 3 },
    ],
    watch: ['M522 188 H600 V185 H703', 'M703 495 H630'],
  },
];
