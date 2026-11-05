import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cloudIcon } from './icons';
import type { DiagramIcon, ServiceNode as ServiceNodeType } from './types';

const SIDES = [
  { id: 't', position: Position.Top },
  { id: 'r', position: Position.Right },
  { id: 'b', position: Position.Bottom },
  { id: 'l', position: Position.Left },
] as const;

function NodeIcon({ icon }: { icon: DiagramIcon }) {
  if (typeof icon === 'string') {
    return <img src={icon} alt="" width={32} height={32} className="vdd-node-icon" />;
  }
  return (
    <picture className="vdd-node-icon">
      <source media="(prefers-color-scheme: dark)" srcSet={icon.dark} />
      <img src={icon.light} alt="" width={32} height={32} />
    </picture>
  );
}

export function ServiceNode({ data }: NodeProps<ServiceNodeType>) {
  return (
    <div className="vdd-node" data-kind={data.kind}>
      {SIDES.map((s) => (
        <Handle
          key={s.id}
          id={s.id}
          type="source"
          position={s.position}
          className="vdd-handle"
          isConnectable={false}
        />
      ))}
      {data.icon && <NodeIcon icon={data.icon} />}
      <span className="vdd-node-text">
        {data.logo ? (
          <span className="vdd-logo-plate">
            <img src={data.logo} alt={data.label} height={24} />
          </span>
        ) : (
          <span className="vdd-node-label">{data.label}</span>
        )}
        {data.detail && <span className="vdd-node-detail">{data.detail}</span>}
      </span>
    </div>
  );
}

export function GroupLabel({ data }: NodeProps) {
  return (
    <span className="vdd-group-label">
      {/* Theme classes from global.css: the header switch or the device setting decides. */}
      <img className="only-light" src={cloudIcon.light} alt="" width={24} height={24} />
      <img className="only-dark" src={cloudIcon.dark} alt="" width={24} height={24} />
      {String(data.label)}
    </span>
  );
}
