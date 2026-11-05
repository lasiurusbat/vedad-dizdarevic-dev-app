import { useEffect, useState } from 'react';
import { Background, ConnectionMode, Controls, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import './flow.css';
import { GroupLabel, ServiceNode } from './ServiceNode';
import { sortedProduction } from './sorted-production';

const nodeTypes = { service: ServiceNode, group: GroupLabel };
const diagrams = { 'sorted-production': sortedProduction };

export type DiagramId = keyof typeof diagrams;

/** Mouse and trackpad can drag-pan; on touch, a swipe has to keep scrolling the page. */
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

export default function FlowDiagram({ id, label }: { id: DiagramId; label: string }) {
  const diagram = diagrams[id];
  const fine = useFinePointer();
  return (
    <div className="vdd-flow" data-pan={fine} role="group" aria-label={label}>
      <ReactFlow
        nodes={diagram.nodes}
        edges={diagram.edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.02 }}
        minZoom={0.2}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        panOnDrag={fine}
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
