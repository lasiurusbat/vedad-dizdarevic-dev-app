import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cloudIcon } from './icons';
import type { ServiceNode as ServiceNodeType } from './types';

const SIDES = [
  { id: 't', position: Position.Top },
  { id: 'r', position: Position.Right },
  { id: 'b', position: Position.Bottom },
  { id: 'l', position: Position.Left },
] as const;

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
      {data.icon && <img src={data.icon} alt="" width={32} height={32} className="vdd-node-icon" />}
      <span className="vdd-node-text">
        <span className="vdd-node-label">{data.label}</span>
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
