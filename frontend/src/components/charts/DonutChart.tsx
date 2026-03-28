"use client";
import { useState, useEffect } from "react";

interface Segment { label: string; value: number; color: string; }

interface DonutChartProps {
  data: Segment[];
  size?: number;
  thickness?: number;
  className?: string;
}

export function DonutChart({ data, size = 180, thickness = 24, className = "" }: DonutChartProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let start: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      setProgress(p);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, []);

  const total = data.reduce((a, d) => a + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={thickness} />

          {data.map((seg, i) => {
            const pct = seg.value / total;
            const dashLength = circumference * pct * progress;
            const dashGap = circumference - dashLength;
            const offset = circumference * cumulative;
            cumulative += pct;

            return (
              <circle
                key={seg.label}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${dashLength} ${dashGap}`}
                strokeDashoffset={-offset * progress}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dasharray 0.5s ease" }}
                filter={`drop-shadow(0 0 6px ${seg.color}40)`}
              />
            );
          })}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="stat-value text-2xl text-[var(--color-text-primary)]">{total}</span>
          <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider mt-0.5">Total</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
        {data.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color, boxShadow: `0 0 6px ${seg.color}50` }} />
            <span className="text-xs text-[var(--color-text-secondary)]">{seg.label}</span>
            <span className="mono-data text-xs font-bold text-[var(--color-text-primary)]">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
