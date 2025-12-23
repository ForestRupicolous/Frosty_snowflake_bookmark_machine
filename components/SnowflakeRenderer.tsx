
import React from 'react';
import { Snowflake } from '../types';

interface SnowflakeRendererProps {
  snowflake: Snowflake;
  strokeWidth: number;
  minLineWidth: number;
}

/**
 * Renders a tapered branch segment as a path.
 * Ensures that the width never falls below the user-defined minLineWidth for nozzle compatibility.
 */
const TaperedSegment: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  startWidth: number;
  endWidth: number;
  minWidth: number;
}> = ({ x1, y1, x2, y2, startWidth, endWidth, minWidth }) => {
  const sw = Math.max(minWidth, startWidth);
  const ew = Math.max(minWidth, endWidth);

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const perpAngle = angle + Math.PI / 2;

  const x1_a = x1 + (sw / 2) * Math.cos(perpAngle);
  const y1_a = y1 + (sw / 2) * Math.sin(perpAngle);
  const x1_b = x1 - (sw / 2) * Math.cos(perpAngle);
  const y1_b = y1 - (sw / 2) * Math.sin(perpAngle);

  const x2_a = x2 + (ew / 2) * Math.cos(perpAngle);
  const y2_a = y2 + (ew / 2) * Math.sin(perpAngle);
  const x2_b = x2 - (ew / 2) * Math.cos(perpAngle);
  const y2_b = y2 - (ew / 2) * Math.sin(perpAngle);

  return (
    <path
      d={`M ${x1_a} ${y1_a} L ${x2_a} ${y2_a} L ${x2_b} ${y2_b} L ${x1_b} ${y1_b} Z`}
      fill="white"
    />
  );
};

const SnowflakeRenderer: React.FC<SnowflakeRendererProps> = ({ snowflake, strokeWidth, minLineWidth }) => {
  const { x, y, radius, rotation, branches, coreRadius, branchWidth } = snowflake;
  const mainBranch = branches[0];
  
  // The global strokeWidth setting acts as a multiplier for our generated branch widths
  const actualBaseWidth = branchWidth * (strokeWidth / 1.2);

  const renderBranch = (angle: number) => {
    const rotationDeg = (angle * 180) / Math.PI;
    return (
      <g transform={`rotate(${rotationDeg})`}>
        {/* Main branch stem with tapering */}
        <TaperedSegment
          x1={0}
          y1={0}
          x2={mainBranch.length}
          y2={0}
          startWidth={actualBaseWidth}
          endWidth={actualBaseWidth * 0.4}
          minWidth={minLineWidth}
        />

        {/* Mirrored sub-branches (dendrites) */}
        {mainBranch.subBranches.map((sb, idx) => {
          const startX = sb.pos * mainBranch.length;
          const sbStartWidth = actualBaseWidth * (1 - sb.pos * 0.4) * 0.75;
          
          return (
            <g key={idx} transform={`translate(${startX}, 0)`}>
              {/* Upper dendrite */}
              <TaperedSegment
                x1={0}
                y1={0}
                x2={sb.length * Math.cos(sb.angle)}
                y2={-sb.length * Math.sin(sb.angle)}
                startWidth={sbStartWidth}
                endWidth={sbStartWidth * 0.5}
                minWidth={minLineWidth}
              />
              {/* Lower dendrite */}
              <TaperedSegment
                x1={0}
                y1={0}
                x2={sb.length * Math.cos(sb.angle)}
                y2={sb.length * Math.sin(sb.angle)}
                startWidth={sbStartWidth}
                endWidth={sbStartWidth * 0.5}
                minWidth={minLineWidth}
              />
            </g>
          );
        })}
      </g>
    );
  };

  // Replaced circle with a Hexagonal Core for realism and easier printing
  const hexagonPoints = coreRadius > 0 
    ? Array.from({ length: 6 }).map((_, i) => {
        const a = (i * Math.PI) / 3;
        return `${coreRadius * Math.cos(a)},${coreRadius * Math.sin(a)}`;
      }).join(" ")
    : null;

  return (
    <g transform={`translate(${x}, ${y}) rotate(${(rotation * 180) / Math.PI})`}>
      {/* Central core hexagonal plate */}
      {hexagonPoints && (
        <polygon points={hexagonPoints} fill="white" />
      )}
      
      {/* 6-fold rotational symmetry */}
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <React.Fragment key={angle}>
          {renderBranch((angle * Math.PI) / 180)}
        </React.Fragment>
      ))}
    </g>
  );
};

export default SnowflakeRenderer;
