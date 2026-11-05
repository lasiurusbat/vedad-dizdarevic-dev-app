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
import { useEffect, useState } from 'react';
import '@xyflow/react/dist/base.css';
import './flow.css';
import { GroupLabel, ServiceNode } from './ServiceNode';
import { sortedProduction } from './sorted-production';
import type { DiagramNode } from './types';

const nodeTypes = { service: ServiceNode, group: GroupLabel };
const diagrams = { 'sorted-production': sortedProduction };

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

function Diagram({ id, label }: { id: DiagramId; label: string }) {
  const diagram = diagrams[id];
  const fine = useFinePointer();
  // Zoom of the initial fitted view = 100%. Dragging only makes sense once the visitor has zoomed in
  // past it, because until then the whole diagram is already visible.
  const [fitZoom, setFitZoom] = useState<number | null>(null);
  const zoom = useStore((state) => state.transform[2]);
  const zoomedIn = fitZoom !== null && zoom > fitZoom * 1.02;
  const canPan = fine && zoomedIn;
  const onInit = async (instance: ReactFlowInstance<DiagramNode, Edge>) => {
    await instance.fitView({ padding: 0.02 });
    setFitZoom(instance.getZoom());
  };
  return (
    <div className="vdd-flow" data-pan={canPan} role="group" aria-label={label}>
      <ReactFlow
        nodes={diagram.nodes}
        edges={diagram.edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.02 }}
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
        <Controls showInteractive={false} />
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
