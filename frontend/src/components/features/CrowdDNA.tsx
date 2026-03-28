"use client";
import { useMemo } from "react";

interface CrowdDNAProps {
  count: number;
  density: number;
  direction: string;
  zones: number[];
  size?: number;
}

export function CrowdDNA({ count, density, direction, zones, size = 120 }: CrowdDNAProps) {
  const cx = size / 2, cy = size / 2;
  const rings = useMemo(() => {
    const r: { radius: number; segments: { angle: number; length: number; color: string }[] }[] = [];
    const dirVal = ["N","NE","E","SE","S","SW","W","NW"].indexOf(direction);
    for (let ring = 0; ring < 4; ring++) {
      const radius = 12 + ring * 12;
      const segCount = 8 + ring * 4;
      const segments = [];
      for (let s = 0; s < segCount; s++) {
        const angle = (s / segCount) * 360;
        const seed = (count * 7 + density * 13 + ring * 17 + s * 23 + dirVal * 31) % 100;
        const length = 3 + (seed / 100) * 10;
        const zoneIdx = s % zones.length;
        const zoneVal = zones[zoneIdx] || 0;
        const color = zoneVal > 30 ? "#FF4D4D" : zoneVal > 15 ? "#FFC857" : "#00FF9C";
        segments.push({ angle, length, color });
      }
      r.push({ radius, segments });
    }
    return r;
  }, [count, density, direction, zones]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="4" fill="#7B61FF" filter="drop-shadow(0 0 6px #7B61FF)" />
        {/* Rings */}
        {rings.map((ring, ri) => (
          <g key={ri}>
            <circle cx={cx} cy={cy} r={ring.radius} fill="none" stroke="rgba(123,97,255,0.08)" strokeWidth="0.5" />
            {ring.segments.map((seg, si) => {
              const rad = (seg.angle * Math.PI) / 180;
              const x1 = cx + ring.radius * Math.cos(rad);
              const y1 = cy + ring.radius * Math.sin(rad);
              const x2 = cx + (ring.radius + seg.length) * Math.cos(rad);
              const y2 = cy + (ring.radius + seg.length) * Math.sin(rad);
              return (
                <line key={si} x1={x1} y1={y1} x2={x2} y2={y2} stroke={seg.color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
              );
            })}
          </g>
        ))}
      </svg>
      <span className="text-[9px] font-semibold text-[var(--color-purple)] uppercase tracking-widest">Crowd DNA</span>
    </div>
  );
}
