
import React from 'react';
import { Snowflake, GeneratorSettings } from '../types';
import SnowflakeRenderer from './SnowflakeRenderer';

interface BookmarkPreviewProps {
  settings: GeneratorSettings;
  snowflakes: Snowflake[];
}

const BookmarkPreview: React.FC<BookmarkPreviewProps> = ({ settings, snowflakes }) => {
  const strokeWidth = settings.thickness > 0 ? settings.thickness : 1;
  const holeX = settings.width / 2;
  const holeY = 12;
  const clipId = "bookmark-clip-path";

  return (
    <div className="flex justify-center items-center bg-gray-900 rounded-xl p-8 shadow-inner overflow-hidden min-h-[600px]">
      <div className="relative" style={{ width: settings.width * 3.5, height: settings.height * 3.5 }}>
        <svg
          viewBox={`0 0 ${settings.width} ${settings.height}`}
          className="w-full h-full snowflake-canvas drop-shadow-2xl"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                x="0"
                y="0"
                width={settings.width}
                height={settings.height}
                rx="4"
              />
            </clipPath>
          </defs>

          {/* Main Bookmark Body */}
          <rect
            x="0"
            y="0"
            width={settings.width}
            height={settings.height}
            rx="4"
            fill="#1e293b"
            stroke="#64748b"
            strokeWidth="0.5"
          />
          
          {/* Tassel Hole */}
          <circle
            cx={holeX}
            cy={holeY}
            r={settings.holeRadius}
            fill="#0f172a"
            stroke="#64748b"
            strokeWidth="0.2"
          />

          {/* Render Snowflakes with clipping applied */}
          <g clipPath={`url(#${clipId})`}>
            {snowflakes.map((flake) => (
              <SnowflakeRenderer 
                key={flake.id} 
                snowflake={flake} 
                strokeWidth={strokeWidth} 
                minLineWidth={settings.minLineWidth}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default BookmarkPreview;
