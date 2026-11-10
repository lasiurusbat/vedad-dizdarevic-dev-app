/**
 * Every diagram by id: the one list that ArchitectureDiagram (build time) and FlowDiagram (in the
 * browser) look ids up in. Add a new diagram here and its id becomes valid in MDX.
 */
import { rainalertRelease } from './rainalert-release';
import { sitePlatform } from './site-platform';
import { sortedProduction } from './sorted-production';
import { sortedRelease } from './sorted-release';
import type { DiagramDefinition } from './types';

export const diagrams = {
  'sorted-production': sortedProduction,
  'sorted-release': sortedRelease,
  'rainalert-release': rainalertRelease,
  'site-platform': sitePlatform,
} satisfies Record<string, DiagramDefinition>;

export type DiagramId = keyof typeof diagrams;
