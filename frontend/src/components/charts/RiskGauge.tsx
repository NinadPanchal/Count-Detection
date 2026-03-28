"use client";
import { useState, useEffect, useRef } from "react";

interface RiskGaugeProps {
  value: number; // 0-100
  size?: number;
  label?: string;
  className?: string;
}

export function RiskGauge({ value, size = 200, label = "Risk Score", className = "" }: RiskGaugeProps) {
  const [animVal, setAnimVal] = useState(0);
  const prevValueRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const fromVal = prevValueRef.current;
    const toVal = value;
    
    // Skip animation if difference is trivial (< 2 points)
    if (Math.abs(toVal - fromVal) < 2) {
      setAnimVal(toVal);
      prevValueRef.current = toVal;
      return;
    }

    // Cancel any in-flight animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    let start: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 800, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      const current = fromVal + (toVal - fromVal) * eased;
      setAnimVal(current);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = toVal;
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 16;
  const startAngle = 135;
  const totalAngle = 270;
  const currentAngle = startAngle + (animVal / 100) * totalAngle;
  const endAngle = startAngle + totalAngle;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (start: number, end: number) => {
    const s = toRad(start), e = toRad(end);
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const large = end - start > 180 ? 1 : 0;
    return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`;
  };

  const color = animVal > 70 ? "#FF4D4D" : animVal > 40 ? "#FFC857" : "#00FF9C";
  const status = animVal > 70 ? "CRITICAL" : animVal > 40 ? "ELEVATED" : "NORMAL";

  // Needle position
  const needleAngle = toRad(currentAngle);
  const needleLen = r - 8;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
        {/* Background arc */}
        <path d={arcPath(startAngle, endAngle)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />

        {/* Colored sections */}
        <path d={arcPath(startAngle, startAngle + totalAngle * 0.4)} fill="none" stroke="#00FF9C" strokeWidth="10" strokeLinecap="round" opacity="0.15" />
        <path d={arcPath(startAngle + totalAngle * 0.4, startAngle + totalAngle * 0.7)} fill="none" stroke="#FFC857" strokeWidth="10" strokeLinecap="round" opacity="0.15" />
        <path d={arcPath(startAngle + totalAngle * 0.7, endAngle)} fill="none" stroke="#FF4D4D" strokeWidth="10" strokeLinecap="round" opacity="0.15" />

        {/* Active arc */}
        <path d={arcPath(startAngle, currentAngle)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" filter={`drop-shadow(0 0 8px ${color}60)`} />

        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round" filter={`drop-shadow(0 0 4px ${color})`} />
        <circle cx={cx} cy={cy} r="5" fill={color} filter={`drop-shadow(0 0 6px ${color})`} />

        {/* Score */}
        <text x={cx} y={cy - 12} textAnchor="middle" fill={color} fontFamily="Inter" fontWeight="800" fontSize={size * 0.18}>{Math.round(animVal)}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--color-text-tertiary)" fontFamily="Inter" fontWeight="600" fontSize="10">{status}</text>
      </svg>
      <span className="text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}
