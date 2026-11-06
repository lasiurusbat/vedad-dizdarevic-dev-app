import type { Edge, Node } from '@xyflow/react';

/** An icon URL, or a light/dark pair swapped with the visitor's theme. */
export type DiagramIcon = string | { light: string; dark: string };

/** What a service node shows. `kind` picks the accent colour in flow.css. */
export interface ServiceData extends Record<string, unknown> {
  label: string;
  detail?: string;
  /** Official icon or logo, unmodified. A { light, dark } pair is swapped with the visitor's theme. Cloudflare has none and shows text only. */
  icon?: DiagramIcon;
  /** A brand logo shown on a white plate instead of the text label (Cloudflare). */
  logo?: string;
  kind: 'edge' | 'compute' | 'data' | 'mail' | 'security' | 'delivery' | 'external';
}

export type ServiceNode = Node<ServiceData, 'service'>;
/** A box around nodes. `cloud` (the AWS Region) shows the official AWS Cloud icon; VPC and subnet
 * boxes are labelled boxes styled by `variant` (flow.css), since no icon is drawn for them. */
export interface GroupData extends Record<string, unknown> {
  label: string;
  variant?: 'cloud' | 'vpc' | 'public' | 'private';
}
export type GroupNode = Node<GroupData, 'group'>;
export type DiagramNode = ServiceNode | GroupNode;

export interface DiagramDefinition {
  id: string;
  nodes: DiagramNode[];
  edges: Edge[];
  /** fitView padding (share of the diagram). Default 0.02. */
  padding?: number;
  /** Zoom buttons in a row instead of a column: wide, flat diagrams have room below the nodes but
   * not beside them. */
  controlsHorizontal?: boolean;
  /** Ordered text alternative: what the diagram says, for screen readers and no-JS visitors. */
  description: { en: string[]; de: string[] };
}
