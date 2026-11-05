import type { Edge, Node } from '@xyflow/react';

/** What a service node shows. `kind` picks the accent colour in flow.css. */
export interface ServiceData extends Record<string, unknown> {
  label: string;
  detail?: string;
  /** URL of an official AWS Architecture Icon. Services without one (Cloudflare, GitHub) show text only. */
  icon?: string;
  kind: 'edge' | 'compute' | 'data' | 'mail' | 'security' | 'delivery' | 'external';
}

export type ServiceNode = Node<ServiceData, 'service'>;
export type GroupNode = Node<{ label: string }, 'group'>;
export type DiagramNode = ServiceNode | GroupNode;

export interface DiagramDefinition {
  id: string;
  nodes: DiagramNode[];
  edges: Edge[];
  /** Ordered text alternative: what the diagram says, for screen readers and no-JS visitors. */
  description: { en: string[]; de: string[] };
}
