"use client";
import { useState, useEffect } from "react";

interface BarData { zone: string; current: number; capacity: number; }

interface BarChartProps {
  data: BarData[];
  height?: number;
  animated?: boolean;
  className?: string;
}

export function BarChart({ data, height = 250, animated = true, className = "" }: BarChartProps) {
  const [progress, setProgress] = useState(animated ? 0 : 1);

  useEffect(() => {
    if (!animated) return;
    let start: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 800, 1);
      setProgress(p);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [animated]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {data.map((item, i) => {
        const pct = Math.min((item.current / item.capacity) * 100, 100) * progress;
        const color = pct > 75 ? "#FF4D4D" : pct > 50 ? "#FFC857" : "#00FF9C";
        return (
          <div key={item.zone} className="animate-slide-in-bottom" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">{item.zone}</span>
              <span className="mono-data text-xs font-bold" style={{ color }}>{item.current}<span className="text-[var(--color-text-tertiary)]">/{item.capacity}</span></span>
            </div>
            <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}80, ${color})`,
                  boxShadow: `0 0 12px ${color}40`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
