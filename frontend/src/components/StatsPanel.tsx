"use client";

import { useEffect, useState, useRef } from "react";

interface StatsPanelProps {
  totalCount: number;
  densityLevel: "safe" | "warning" | "critical";
  avgDensity: number;
  peakCount: number;
  zones: Array<{
    id: string;
    name: string;
    count: number;
    density: number;
    density_level: string;
  }>;
  isConnected: boolean;
}

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const prev = prevRef.current;
    if (value === prev) return;
    
    // Smooth counter animation
    const duration = 400;
    const start = performance.now();
    const from = prev;
    const to = value;
    
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayValue(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
    prevRef.current = value;
  }, [value]);

  return <span className={className}>{displayValue}</span>;
}

function StatusBadge({
  level,
}: {
  level: "safe" | "warning" | "critical";
}) {
  const labels = { safe: "Normal", warning: "Elevated", critical: "Over Capacity" };
  const pillClass = level === "critical" ? "pill-critical" : level === "warning" ? "pill-warning" : "pill-safe";
  
  return (
    <div className={`pill-badge ${pillClass}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-current" />
      {labels[level]}
    </div>
  );
}

export default function StatsPanel({
  totalCount,
  densityLevel,
  avgDensity,
  peakCount,
  zones,
  isConnected,
}: StatsPanelProps) {
  const levelColor =
    densityLevel === "critical"
      ? "var(--color-critical)"
      : densityLevel === "warning"
      ? "var(--color-warning)"
      : "var(--color-safe)";

  // Gauge calculation (0 to 50 people max)
  const maxPeople = 50;
  const gaugePercent = Math.min(totalCount / maxPeople, 1);
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference * (1 - gaugePercent * 0.75); // 270 degree arc

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in">
        <div className="panel p-6">
          <div className="skeleton h-4 w-28 mb-5" />
          <div className="skeleton h-16 w-20 mb-3" />
          <div className="skeleton h-3 w-36" />
        </div>
        <div className="panel p-6">
          <div className="skeleton h-36 w-36 rounded-full mx-auto mb-4" />
        </div>
        <div className="panel p-6">
          <div className="skeleton h-3 w-24 mb-5" />
          <div className="flex flex-col gap-2">
            <div className="skeleton h-10 w-full rounded-lg" />
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-slide-in-bottom">
      {/* Hero Stat Card */}
      <div className="panel p-6">
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-accent-muted)] border border-[var(--color-border-accent)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className="stat-label">Total Detected</span>
          </div>
          <StatusBadge level={densityLevel} />
        </div>
        
        <div className="flex items-baseline gap-3 mb-6">
          <AnimatedCounter
            value={totalCount}
            className="stat-value text-6xl text-[var(--color-text-primary)]"
          />
          <span className="text-sm text-[var(--color-text-tertiary)] font-medium">/ {maxPeople}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-5 border-t border-[var(--color-border)]">
          <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <div className="stat-label text-[10px] mb-1.5">Peak Count</div>
            <div className="stat-value text-xl text-[var(--color-text-primary)]">{peakCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <div className="stat-label text-[10px] mb-1.5">Avg Density</div>
            <div className="stat-value text-xl text-[var(--color-text-primary)]">{avgDensity}</div>
          </div>
        </div>
      </div>

      {/* Density Gauge */}
      <div className="panel p-6 flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-5">
          <span className="stat-label">Density Level</span>
          <span className="mono-data text-[11px] font-semibold text-[var(--color-text-tertiary)] bg-[var(--color-bg-elevated)] px-3 py-1 rounded-full border border-[var(--color-border)]">
            {Math.round(gaugePercent * 100)}%
          </span>
        </div>
        
        <div className="relative w-36 h-36">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[135deg]">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--color-bg-elevated)"
              strokeWidth="5"
              strokeDasharray={`${circumference * 0.75} ${circumference}`}
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={levelColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${circumference * 0.75} ${circumference}`}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
              style={{
                filter: `drop-shadow(0 0 6px ${levelColor})`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="stat-value text-2xl text-[var(--color-text-primary)]">
              {densityLevel === "safe" ? "Low" : densityLevel === "warning" ? "Med" : "High"}
            </span>
            <span className="text-[10px] text-[var(--color-text-tertiary)] mt-1">density</span>
          </div>
        </div>
      </div>

      {/* Zone Status */}
      <div className="panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <span className="stat-label">Zonal Breakdown</span>
        </div>
        <div className="flex flex-col gap-2">
          {zones.map((zone) => {
            const isCrit = zone.density_level === "critical";
            const isWarn = zone.density_level === "warning";
            const dotColor = isCrit ? "var(--color-critical)" : isWarn ? "var(--color-warning)" : "var(--color-safe)";
            
            return (
              <div
                key={zone.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full transition-colors duration-500" style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}40` }} />
                  <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                    {zone.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`mono-data text-sm font-bold ${isCrit ? "text-[var(--color-critical)]" : "text-[var(--color-text-primary)]"}`}>
                    {zone.count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
