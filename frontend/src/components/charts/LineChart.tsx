"use client";
import { useState, useMemo, useEffect } from "react";

interface DataPoint { time: string; count: number; }

interface LineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  animated?: boolean;
  className?: string;
}

export function LineChart({ data, width = 600, height = 200, color = "#00FF9C", showArea = true, animated = true, className = "" }: LineChartProps) {
  const [progress, setProgress] = useState(animated ? 0 : 1);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!animated) return;
    let start: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1200, 1);
      setProgress(p);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [animated]);

  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { path, areaPath, points, maxVal, minVal } = useMemo(() => {
    if (data.length === 0) return { path: "", areaPath: "", points: [], maxVal: 0, minVal: 0 };
    const vals = data.map((d) => d.count);
    const maxV = Math.max(...vals) * 1.1 || 1;
    const minV = 0;
    const pts = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1)) * chartW,
      y: padding.top + chartH - ((d.count - minV) / (maxV - minV)) * chartH,
      ...d,
    }));

    const visibleCount = Math.floor(pts.length * progress);
    const visible = pts.slice(0, Math.max(visibleCount, 2));
    const pathStr = visible.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaStr = pathStr + ` L${visible[visible.length - 1].x},${padding.top + chartH} L${visible[0].x},${padding.top + chartH} Z`;

    return { path: pathStr, areaPath: areaStr, points: pts, maxVal: maxV, minVal: minV };
  }, [data, progress, chartW, chartH, padding.left, padding.top]);

  const gridLines = 4;
  const yLabels = Array.from({ length: gridLines + 1 }, (_, i) => Math.round(maxVal * (1 - i / gridLines)));

  return (
    <div className={`chart-container ${className}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map((val, i) => {
          const y = padding.top + (i / gridLines) * chartH;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(0,255,156,0.06)" strokeWidth="1" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="var(--color-text-tertiary)" fontSize="10" fontFamily="JetBrains Mono">{val}</text>
            </g>
          );
        })}

        {/* X labels */}
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i) => {
          const idx = data.indexOf(d);
          const x = padding.left + (idx / (data.length - 1)) * chartW;
          return <text key={i} x={x} y={height - 4} textAnchor="middle" fill="var(--color-text-tertiary)" fontSize="9" fontFamily="JetBrains Mono">{d.time}</text>;
        })}

        {/* Area fill */}
        {showArea && areaPath && <path d={areaPath} fill="url(#lineGrad)" />}

        {/* Line */}
        {path && <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Hover dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y} r={hoveredIdx === i ? 5 : 0}
            fill={color}
            style={{ transition: "r 0.15s ease" }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}

        {/* Invisible hover zones */}
        {points.map((p, i) => (
          <rect
            key={`h-${i}`}
            x={p.x - chartW / data.length / 2} y={padding.top} width={chartW / data.length} height={chartH}
            fill="transparent" cursor="crosshair"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}

        {/* Tooltip */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <g>
            <line x1={points[hoveredIdx].x} y1={padding.top} x2={points[hoveredIdx].x} y2={padding.top + chartH} stroke={color} strokeWidth="1" opacity="0.3" strokeDasharray="4,4" />
            <rect x={points[hoveredIdx].x - 30} y={points[hoveredIdx].y - 28} width="60" height="22" rx="6" fill="rgba(11,27,43,0.95)" stroke={color} strokeWidth="1" />
            <text x={points[hoveredIdx].x} y={points[hoveredIdx].y - 13} textAnchor="middle" fill={color} fontSize="11" fontWeight="600" fontFamily="Inter">{points[hoveredIdx].count}</text>
          </g>
        )}
      </svg>
    </div>
  );
}
