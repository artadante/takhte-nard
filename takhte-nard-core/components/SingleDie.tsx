/* SingleDie.tsx
 * High-quality 2D die component for roll-off and UI status indicators.
 */

import React from 'react';

interface DiceProps {
  value: number;
  size?: number;
  isRolling?: boolean;
  isBurned?: boolean;
  onClick?: () => void;
}

export const SingleDie: React.FC<DiceProps> = ({
  value,
  size = 50,
  isRolling = false,
  isBurned = false,
  onClick,
}) => {
  const pipPositions: Record<number, Array<[number, number]>> = {
    1: [[0.5, 0.5]],
    2: [[0.28, 0.28], [0.72, 0.72]],
    3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
    5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
    6: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.5], [0.72, 0.5], [0.28, 0.72], [0.72, 0.72]],
  };

  const pips = pipPositions[value] || [];
  const pipRadius = size * 0.08;

  return (
    <div
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${size * 0.18}px`,
      }}
      className={`relative select-none flex-shrink-0 cursor-pointer shadow-lg transition-transform duration-200 ${
        isRolling ? 'animate-bounce rotate-12 scale-105' : 'hover:scale-105'
      } bg-gradient-to-br from-white via-stone-100 to-stone-300 border border-stone-200/80`}
    >
      {/* Glossy top highlight */}
      <div className="absolute inset-x-1 top-1 h-2/5 rounded-t-lg bg-gradient-to-b from-white/70 to-transparent pointer-events-none" />

      {/* Pips */}
      <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        {pips.map(([px, py], idx) => (
          <circle
            key={idx}
            cx={px * size}
            cy={py * size}
            r={pipRadius}
            fill="#18181b"
          />
        ))}
      </svg>

      {/* Burned red cross */}
      {isBurned && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-4/5 h-4/5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <line x1="4" y1="4" x2="20" y2="20" stroke="#ef4444" strokeLinecap="round" />
            <line x1="20" y1="4" x2="4" y2="20" stroke="#ef4444" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
};
