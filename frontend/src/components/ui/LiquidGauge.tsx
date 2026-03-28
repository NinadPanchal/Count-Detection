"use client";

interface LiquidGaugeProps {
  value: number; // 0-100
  size?: number;
  label?: string;
}

export function LiquidGauge({ value, size = 120, label }: LiquidGaugeProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const fillHeight = (clampedValue / 100) * size;
  const fillY = size - fillHeight;
  const color = clampedValue > 75 ? "#FF4D4D" : clampedValue > 50 ? "#FFC857" : "#00FF9C";
  const r = size / 2 - 4;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <clipPath id={`circle-clip-${size}-${label}`}>
            <circle cx={size / 2} cy={size / 2} r={r} />
          </clipPath>
        </defs>
        {/* Background circle */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,255,156,0.1)" strokeWidth="2" />
        {/* Liquid fill */}
        <g clipPath={`url(#circle-clip-${size}-${label})`}>
          <rect x="0" y={fillY} width={size} height={fillHeight + 4} fill={color} opacity="0.2" />
          {/* Wave */}
          <path
            d={`M0,${fillY} Q${size * 0.25},${fillY - 6} ${size * 0.5},${fillY} T${size},${fillY} V${size} H0 Z`}
            fill={color}
            opacity="0.3"
          >
            <animateTransform attributeName="transform" type="translate" values={`0,0; ${size * 0.1},0; 0,0`} dur="3s" repeatCount="indefinite" />
          </path>
          <path
            d={`M0,${fillY + 3} Q${size * 0.25},${fillY + 9} ${size * 0.5},${fillY + 3} T${size},${fillY + 3} V${size} H0 Z`}
            fill={color}
            opacity="0.15"
          >
            <animateTransform attributeName="transform" type="translate" values={`0,0; ${-size * 0.08},0; 0,0`} dur="2.5s" repeatCount="indefinite" />
          </path>
        </g>
        {/* Value text */}
        <text x={size / 2} y={size / 2 + 2} textAnchor="middle" dominantBaseline="middle" fill={color} fontFamily="Inter" fontWeight="700" fontSize={size * 0.22}>
          {Math.round(clampedValue)}%
        </text>
        {/* Outer ring */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="1.5" opacity="0.3" />
      </svg>
      {label && <span className="text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{label}</span>}
    </div>
  );
}
