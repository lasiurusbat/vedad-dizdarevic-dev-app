import {
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useStore,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import '@xyflow/react/dist/base.css';
import './flow.css';
import { GroupLabel, ServiceNode } from './ServiceNode';
import { type DiagramId, diagrams } from './index';
import type { DiagramDefinition, DiagramNode } from './types';

const nodeTypes = { service: ServiceNode, group: GroupLabel };
/** Mouse and trackpad only; on touch a swipe has to keep scrolling the page. */
function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFine(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return fine;
}

/**
 * On a narrow screen the diagram keeps a readable width and its figure scrolls sideways. Start that
 * scroll centred on the focus node, so the first thing visible is the main path, not the left edge.
 */
function centreOnFocus(el: HTMLElement | null, nodeId: string | undefined) {
  const scroller = el?.closest<HTMLElement>('.overflow-x-auto');
  if (!el || !scroller || !nodeId || scroller.scrollWidth <= scroller.clientWidth) return;
  const node = el.querySelector<HTMLElement>(`.react-flow__node[data-id="${nodeId}"]`);
  if (!node) return;
  const box = node.getBoundingClientRect();
  const frame = scroller.getBoundingClientRect();
  const centre = box.left + box.width / 2 - frame.left + scroller.scrollLeft;
  scroller.scrollLeft = centre - scroller.clientWidth / 2;
}

/**
 * Path buttons live in the figure around the canvas (ArchitectureDiagram.astro), rendered on the
 * server and hidden until this runs, so a visitor without JavaScript never sees dead buttons.
 * Choosing a path sets classes on its nodes and edges (lit) and on the rest (dimmed); no style
 * attributes, so the CSP stays strict. The path's summary goes to a polite live region.
 */
function usePathButtons(
  wrapper: RefObject<HTMLDivElement | null>,
  diagram: DiagramDefinition,
  onChange: (pathId: string | null) => void,
) {
  useEffect(() => {
    const figure = wrapper.current?.closest('figure');
    const bar = figure?.querySelector<HTMLElement>('[data-paths]');
    if (!figure || !bar || !diagram.paths?.length) return;
    const buttons = [...bar.querySelectorAll<HTMLButtonElement>('button[data-path]')];
    const status = figure.querySelector<HTMLElement>('[data-path-status]');
    const select = (button: HTMLButtonElement) => {
      const id = button.dataset.path || null;
      for (const b of buttons) b.setAttribute('aria-pressed', String(b === button));
      if (status) status.textContent = button.dataset.summary ?? '';
      onChange(id);
      const path = diagram.paths?.find((p) => p.id === id);
      centreOnFocus(wrapper.current, path?.focus ?? diagram.focusNode);
    };
    const handlers = buttons.map((b) => {
      const handler = () => select(b);
      b.addEventListener('click', handler);
      return handler;
    });
    bar.hidden = false;
    return () => buttons.forEach((b, i) => b.removeEventListener('click', handlers[i]!));
  }, [wrapper, diagram, onChange]);
}

function Diagram({ id, label }: { id: DiagramId; label: string }) {
  const diagram = diagrams[id];
  const fine = useFinePointer();
  const padding = diagram.padding ?? 0.02;
  // Zoom of the initial fitted view = 100%. Dragging only makes sense once the visitor has zoomed in
  // past it, because until then the whole diagram is already visible.
  const [fitZoom, setFitZoom] = useState<number | null>(null);
  const zoom = useStore((state) => state.transform[2]);
  const zoomedIn = fitZoom !== null && zoom > fitZoom * 1.02;
  const canPan = fine && zoomedIn;
  const wrapper = useRef<HTMLDivElement>(null);
  const [pathId, setPathId] = useState<string | null>(null);
  usePathButtons(wrapper, diagram, setPathId);
  const path = diagram.paths?.find((p) => p.id === pathId);
  const nodes = useMemo(
    () =>
      path
        ? diagram.nodes.map((n) =>
            n.type === 'group'
              ? n
              : { ...n, className: path.nodes.includes(n.id) ? 'vdd-on' : 'vdd-dim' },
          )
        : diagram.nodes,
    [diagram, path],
  );
  const edges = useMemo(
    () =>
      path
        ? diagram.edges.map((e) =>
            path.edges.includes(e.id)
              ? {
                  ...e,
                  className: 'vdd-on',
                  markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent)' },
                }
              : { ...e, className: 'vdd-dim' },
          )
        : diagram.edges,
    [diagram, path],
  );
  const onInit = async (instance: ReactFlowInstance<DiagramNode, Edge>) => {
    await instance.fitView({ padding });
    setFitZoom(instance.getZoom());
    centreOnFocus(wrapper.current, diagram.focusNode);
  };
  return (
    <div ref={wrapper} className="vdd-flow" data-pan={canPan} role="group" aria-label={label}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding }}
        onInit={onInit}
        minZoom={0.2}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        panOnDrag={canPan}
        zoomOnScroll={false}
        zoomActivationKeyCode={['Control', 'Meta']}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} />
        <Controls
          showInteractive={false}
          orientation={diagram.controlsHorizontal ? 'horizontal' : 'vertical'}
        />
      </ReactFlow>
    </div>
  );
}

export default function FlowDiagram(props: { id: DiagramId; label: string }) {
  return (
    <ReactFlowProvider>
      <Diagram {...props} />
    </ReactFlowProvider>
  );
}
