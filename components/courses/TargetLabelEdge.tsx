import React from 'react';
import { getSmoothStepPath, EdgeLabelRenderer, BaseEdge, EdgeProps } from 'reactflow';

export function TargetLabelEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
}: EdgeProps) {
  // 1. Get the path for the line
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            // Position it exactly at targetX/targetY
            // Then translate it up so it doesn't overlap the node border
            transform: `translate(-50%, -100%) translate(${targetX}px, ${targetY - 12}px)`,
            fontSize: 10,
            fontWeight: 600,
            background: '#f0fdf4',
            padding: '2px 6px',
            borderRadius: '10px',
            border: '1px solid #22c55e',
            color: '#15803d',
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}