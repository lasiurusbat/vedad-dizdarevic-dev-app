import { Background, ConnectionMode, Controls, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import './flow.css';
import { GroupLabel, ServiceNode } from './ServiceNode';
import { sortedProduction } from './sorted-production';

const nodeTypes = { service: ServiceNode, group: GroupLabel };
const diagrams = { 'sorted-production': sortedProduction };

export type DiagramId = keyof typeof diagrams;

export default function FlowDiagram({ id, label }: { id: DiagramId; label: string }) {
  const diagram = diagrams[id];
  return (
    <div className="vdd-flow" role="group" aria-label={label}>
      <ReactFlow
        nodes={diagram.nodes}
        edges={diagram.edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.05 }}
        minZoom={0.2}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
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
