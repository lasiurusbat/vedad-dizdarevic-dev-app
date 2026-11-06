import {
  Background,
  ConnectionMode,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useStore,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import { useEffect, useRef, useState } from 'react';
import '@xyflow/react/dist/base.css';
import './flow.css';
import { GroupLabel, ServiceNode } from './ServiceNode';
import { sortedProduction } from './sorted-production';
import { sortedRelease } from './sorted-release';
import type { DiagramNode } from './types';

const nodeTypes = { service: ServiceNode, group: GroupLabel };
const diagrams = { 'sorted-production': sortedProduction, 'sorted-release': sortedRelease };

export type DiagramId = keyof typeof diagrams;

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
  const onInit = async (instance: ReactFlowInstance<DiagramNode, Edge>) => {
    await instance.fitView({ padding });
    setFitZoom(instance.getZoom());
    centreOnFocus(wrapper.current, diagram.focusNode);
  };
  return (
    <div ref={wrapper} className="vdd-flow" data-pan={canPan} role="group" aria-label={label}>
      <ReactFlow
        nodes={diagram.nodes}
        edges={diagram.edges}
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
