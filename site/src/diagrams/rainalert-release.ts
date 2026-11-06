import { MarkerType, type Edge } from '@xyflow/react';
import { genericIcons, githubMark } from './icons';
import type { DiagramDefinition, DiagramIcon, DiagramNode, ServiceData } from './types';

const W = 160;
const H = 56;

/** Service node. Docker Hub, Render and the weather services have no official icon in the repo,
 * so they show text only (no invented symbols). */
const svc = (
  id: string,
  x: number,
  y: number,
  label: string,
  kind: ServiceData['kind'],
  detail: string,
  icon?: DiagramIcon,
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
});

// Layout: the release runs along the top (tag, build and test, gate, Docker Hub) and turns down
// into the deploy job, which calls Render's hook and then smoke-tests the domain. Render sits in
// the middle; visitors reach it through the domain from below right, and it calls the weather
// services on the right (OpenWeather only as a fallback, dashed).
export const nodes: DiagramNode[] = [
  svc('tag', 0, 0, 'git tag v1.2.x', 'delivery', 'the only way to release', githubMark),
  svc('build', 270, 0, 'Build and test', 'delivery', 'tests run inside the image', githubMark),
  svc('gate', 540, 0, 'Release gate', 'delivery', 'tag format, tag on main', githubMark),
  svc('hub', 810, 0, 'Docker Hub', 'delivery', 'one image tag per release'),
  svc('deploy', 540, 150, 'Deploy job', 'delivery', 'production environment', githubMark),
  svc('render', 810, 150, 'Render web service', 'compute', 'image-backed, non-root'),
  svc('smoke', 540, 300, 'Smoke test', 'security', 'expects the new version', githubMark),
  svc('domain', 810, 300, 'rainalert.live', 'edge', 'CNAME, managed TLS'),
  svc('nominatim', 1090, 60, 'Nominatim', 'external', 'geocoding'),
  svc('openmeteo', 1090, 150, 'Open-Meteo', 'external', 'forecast'),
  svc('openweather', 1090, 240, 'OpenWeather', 'external', 'fallback, daily budget'),
  svc('users', 1090, 380, 'Visitors', 'external', 'any city', genericIcons.users),
];

const arrow = { type: MarkerType.ArrowClosed, color: '#8b95a0' } as const;
const e = (
  id: string,
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
  label?: string,
  dashed = false,
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
  ...(dashed ? { className: 'vdd-edge-dashed' } : {}),
});

export const edges: Edge[] = [
  e('r1', 'tag', 'r', 'build', 'l'),
  e('r2', 'build', 'r', 'gate', 'l', 'if green'),
  e('r3', 'gate', 'r', 'hub', 'l', 'push'),
  e('r4', 'gate', 'b', 'deploy', 't'),
  e('r5', 'deploy', 'r', 'render', 'l', 'hook + tag'),
  e('r6', 'hub', 'b', 'render', 't', 'pull'),
  e('r7', 'deploy', 'b', 'smoke', 't'),
  e('r8', 'smoke', 'r', 'domain', 'l', 'version?'),
  e('q1', 'users', 'l', 'domain', 'r', 'HTTPS'),
  e('q2', 'domain', 't', 'render', 'b'),
  e('u1', 'render', 'r', 'nominatim', 'l'),
  e('u2', 'render', 'r', 'openmeteo', 'l'),
  e('u3', 'render', 'r', 'openweather', 'l', undefined, true),
];

export const rainalertRelease: DiagramDefinition = {
  id: 'rainalert-release',
  nodes,
  edges,
  // Render, where the release and the requests meet.
  focusNode: 'render',
  paths: [
    {
      id: 'release',
      label: { en: 'Releases', de: 'Releases' },
      summary: {
        en: 'A git tag builds the image once and tests it inside the image and in a browser. Only a well-formed tag on main pushes that same image to Docker Hub; the deploy job then calls Render’s hook with the exact tag and checks that the live domain answers with the new version.',
        de: 'Ein Git-Tag baut das Image einmal und testet es im Image und im Browser. Nur ein gültiger Tag auf main schiebt genau dieses Image nach Docker Hub; der Deploy-Job ruft dann Renders Hook mit dem exakten Tag auf und prüft, dass die Live-Domain mit der neuen Version antwortet.',
      },
      nodes: ['tag', 'build', 'gate', 'hub', 'deploy', 'render', 'smoke', 'domain'],
      edges: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'],
      focus: 'gate',
    },
    {
      id: 'request',
      label: { en: 'Requests', de: 'Anfragen' },
      summary: {
        en: 'A visitor reaches rainalert.live, a CNAME to the Render service with a managed certificate. The app geocodes the city with Nominatim and asks Open-Meteo for the forecast; when Open-Meteo refuses, OpenWeather answers within a daily call budget.',
        de: 'Besucher erreichen rainalert.live, einen CNAME auf den Render-Dienst mit verwaltetem Zertifikat. Die App ermittelt die Stadt über Nominatim und holt die Vorhersage von Open-Meteo; lehnt Open-Meteo ab, antwortet OpenWeather innerhalb eines täglichen Abrufbudgets.',
      },
      nodes: ['users', 'domain', 'render', 'nominatim', 'openmeteo', 'openweather'],
      edges: ['q1', 'q2', 'u1', 'u2', 'u3'],
      focus: 'render',
    },
  ],
  description: {
    en: [
      'A release starts as a git tag in the RainAlert repository. GitHub Actions builds the container image once and runs the offline tests inside it and the browser tests on the runner.',
      'Only if both pass, and only for a well-formed tag on main, the same image is pushed to Docker Hub under that tag.',
      'A deploy job in the production environment calls Render’s deploy hook with the exact image tag. Render pulls the image and runs it as a non-root web service.',
      'The smoke test then requests the live domain until it answers with the new version number.',
      'Visitors reach rainalert.live, a CNAME to the Render service with a managed TLS certificate. The app geocodes the city with Nominatim and gets the forecast from Open-Meteo, with OpenWeather as a fallback within a daily call budget.',
    ],
    de: [
      'Ein Release beginnt als Git-Tag im RainAlert-Repository. GitHub Actions baut das Container-Image einmal und führt die Offline-Tests darin und die Browser-Tests auf dem Runner aus.',
      'Nur wenn beide bestehen, und nur für einen gültigen Tag auf main, wird dasselbe Image unter diesem Tag nach Docker Hub geschoben.',
      'Ein Deploy-Job in der Umgebung production ruft Renders Deploy-Hook mit dem exakten Image-Tag auf. Render holt das Image und betreibt es als Webdienst ohne Root-Rechte.',
      'Der Smoke-Test fragt danach die Live-Domain ab, bis sie mit der neuen Versionsnummer antwortet.',
      'Besucher erreichen rainalert.live, einen CNAME auf den Render-Dienst mit verwaltetem TLS-Zertifikat. Die App ermittelt die Stadt über Nominatim und holt die Vorhersage von Open-Meteo, mit OpenWeather als Rückfall innerhalb eines täglichen Abrufbudgets.',
    ],
  },
};
