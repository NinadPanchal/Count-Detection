"use client";
import { useState, useEffect, useRef } from "react";

interface Blip { x: number; y: number; severity: string; age: number; }

interface RadarSweepProps {
  threats?: { x: number; y: number; severity: string }[];
  size?: number;
}

export function RadarSweep({ threats = [], size = 220 }: RadarSweepProps) {
  const [angle, setAngle] = useState(0);
  const [blips, setBlips] = useState<Blip[]>([]);
  const cx = size / 2, cy = size / 2, r = size / 2 - 12;

  useEffect(() => {
    const interval = setInterval(() => {
      setAngle((a) => (a + 2) % 360);
      setBlips((prev) => {
        const updated = prev.map((b) => ({ ...b, age: b.age + 1 })).filter((b) => b.age < 100);
        // Add new blips from threats every sweep
        threats.forEach((t) => {
          const tAngle = Math.atan2(t.y - 0.5, t.x - 0.5) * (180 / Math.PI) + 180;
          if (Math.abs(((angle + 180) % 360) - tAngle) < 5) {
            updated.push({ x: t.x, y: t.y, severity: t.severity, age: 0 });
          }
        });
        return updated;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [angle, threats]);

  const sweepRad = (angle * Math.PI) / 180;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="radarBg">
            <stop offset="0%" stopColor="rgba(0,255,156,0.02)" />
            <stop offset="100%" stopColor="rgba(0,255,156,0)" />
          </radialGradient>
        </defs>
        {/* Background */}
        <circle cx={cx} cy={cy} r={r} fill="url(#radarBg)" stroke="rgba(0,255,156,0.15)" strokeWidth="1" />
        {/* Rings */}
        {[0.33, 0.66].map((f, i) => (
          <circle key={i} cx={cx} cy={cy} r={r * f} fill="none" stroke="rgba(0,255,156,0.08)" strokeWidth="0.5" />
        ))}
        {/* Cross lines */}
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="rgba(0,255,156,0.06)" strokeWidth="0.5" />
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="rgba(0,255,156,0.06)" strokeWidth="0.5" />

        {/* Sweep line with trail */}
        <defs>
          <linearGradient id="sweepGrad" gradientTransform={`rotate(${angle - 20}, 0.5, 0.5)`}>
            <stop offset="0%" stopColor="rgba(0,255,156,0)" />
            <stop offset="100%" stopColor="rgba(0,255,156,0.3)" />
          </linearGradient>
        </defs>
        {/* Sweep cone */}
        <path
          d={`M${cx},${cy} L${cx + r * Math.cos(sweepRad)},${cy + r * Math.sin(sweepRad)} A${r},${r} 0 0,0 ${cx + r * Math.cos(sweepRad - 0.5)},${cy + r * Math.sin(sweepRad - 0.5)} Z`}
          fill="rgba(0,255,156,0.08)"
        />
        {/* Sweep line */}
        <line
          x1={cx} y1={cy}
          x2={cx + r * Math.cos(sweepRad)}
          y2={cy + r * Math.sin(sweepRad)}
          stroke="#00FF9C" strokeWidth="1.5" opacity="0.8"
        />

        {/* Blips */}
        {blips.map((b, i) => {
          const bx = cx + (b.x - 0.5) * r * 2 * 0.8;
          const by = cy + (b.y - 0.5) * r * 2 * 0.8;
          const opacity = Math.max(0, 1 - b.age / 100);
          const color = b.severity === "critical" ? "#FF4D4D" : "#FFC857";
          return (
            <g key={i}>
              <circle cx={bx} cy={by} r={4 + (1 - opacity) * 3} fill={color} opacity={opacity * 0.3} />
              <circle cx={bx} cy={by} r="3" fill={color} opacity={opacity} filter={`drop-shadow(0 0 4px ${color})`} />
            </g>
          );
        })}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r="3" fill="#00FF9C" filter="drop-shadow(0 0 6px #00FF9C)" />
      </svg>
      <span className="text-[9px] font-semibold text-[var(--color-accent)] uppercase tracking-widest">Threat Radar</span>
    </div>
  );
}
