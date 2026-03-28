"use client";

import React from "react";
import type { Hotspot, MovementData } from "@/hooks/useWebSocket";
import { SpotlightCard } from "./ui/SpotlightCard";
import { TickingNumber } from "./ui/TickingNumber";
import { DecryptedText } from "./ui/DecryptedText";

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
  hotspots: Hotspot[];
  movement: MovementData | null;
  isConnected: boolean;
}

function StatusBadge({ level }: { level: "safe" | "warning" | "critical" }) {
  const labels = { safe: "Normal", warning: "Elevated", critical: "Over Capacity" };
  const pillClass = level === "critical" ? "pill-critical" : level === "warning" ? "pill-warning" : "pill-safe";
  return (
    <div className={`pill-badge ${pillClass}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-current" />
      <DecryptedText text={labels[level]} animateOn="onMount" />
    </div>
  );
}

const DIRECTION_ARROWS: Record<string, string> = {
  N: "↑", NE: "↗", E: "→", SE: "↘",
  S: "↓", SW: "↙", W: "←", NW: "↖",
  STATIC: "●",
};

export default function StatsPanel({
  totalCount, densityLevel, avgDensity, peakCount, zones, hotspots, movement, isConnected,
}: StatsPanelProps) {
  const levelColor =
    densityLevel === "critical" ? "var(--color-critical)"
    : densityLevel === "warning" ? "var(--color-warning)"
    : "var(--color-safe)";

  const maxPeople = 50;
  const gaugePercent = Math.min(totalCount / maxPeople, 1);
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference * (1 - gaugePercent * 0.75);

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in">
        <div className="panel p-6"><div className="skeleton h-4 w-28 mb-5" /><div className="skeleton h-16 w-20 mb-3" /><div className="skeleton h-3 w-36" /></div>
        <div className="panel p-6"><div className="skeleton h-3 w-24 mb-5" /><div className="flex flex-col gap-2"><div className="skeleton h-10 w-full rounded-lg" /><div className="skeleton h-10 w-full rounded-lg" /></div></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-slide-in-bottom">
      
      {/* Hero Stat Card */}
      <SpotlightCard className="p-6">
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-accent-muted)] border border-[var(--color-border-accent)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className="stat-label">Total Detected</span>
          </div>
          <StatusBadge level={densityLevel} />
        </div>
        
        <div className="flex items-baseline gap-3 mb-6">
          <TickingNumber value={totalCount} className="stat-value text-6xl text-[var(--color-text-primary)]" />
          <span className="text-sm text-[var(--color-text-tertiary)] font-medium">/ {maxPeople}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-5 border-t border-[var(--color-border)] relative z-10">
          <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <div className="stat-label text-[10px] mb-1.5">Peak Count</div>
            <TickingNumber value={peakCount} className="stat-value text-xl text-[var(--color-text-primary)]" />
          </div>
          <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <div className="stat-label text-[10px] mb-1.5">Avg Density</div>
            <TickingNumber value={avgDensity} className="stat-value text-xl text-[var(--color-text-primary)]" />
          </div>
        </div>
      </SpotlightCard>

      {/* Horizontal Bar Chart (Replaced Gauge + Lists) */}
      <SpotlightCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <span className="stat-label">Zone Density Overview</span>
        </div>
        
        <div className="flex flex-col gap-4 relative z-10">
          {zones.map((zone) => {
            // Assume 15 people is max per zone for relative chart scaling
            const pct = Math.min((zone.count / 15) * 100, 100);
            const isCrit = zone.density_level === "critical";
            const isWarn = zone.density_level === "warning";
            const barColor = isCrit ? "var(--color-critical)" : isWarn ? "var(--color-warning)" : "var(--color-safe)";
            
            return (
              <div key={zone.id}>
                <div className="flex justify-between items-end mb-1.5 px-1">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)] tracking-wide">
                    {zone.name}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <TickingNumber value={zone.count} className="mono-data text-sm font-bold text-[var(--color-text-primary)]" />
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">ppl</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-[#111622] rounded-full overflow-hidden border border-[var(--color-border)] inset-shadow-sm">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ 
                      width: `${pct}%`, 
                      backgroundColor: barColor,
                      boxShadow: `0 0 10px ${barColor}80`
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SpotlightCard>

      {/* Hotspot / Red Zones */}
      {hotspots.length > 0 && (
        <SpotlightCard className="p-6 border-[var(--color-critical)]/20" glowColor="rgba(248, 113, 113, 0.15)">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-critical-muted)] border border-[var(--color-critical)]/30">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-critical)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <DecryptedText animateOn="hover" text="Active Hotspots" className="stat-label text-[var(--color-critical)]" />
            </div>
            <span className="ml-auto pill-badge pill-critical text-[9px] py-0.5 px-2">
              {hotspots.length} zone{hotspots.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-col gap-2 relative z-10">
            {hotspots.slice(0, 6).map((hs, i) => (
              <div key={`hs-${i}`} className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${
                hs.severity === "critical"
                  ? "bg-[var(--color-critical-muted)] border-[var(--color-critical)]/20"
                  : "bg-[var(--color-warning-muted)] border-[var(--color-warning)]/20"
              } ${hs.persistent ? "animate-pulse-urgent" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${hs.severity === "critical" ? "bg-[var(--color-critical)]" : "bg-[var(--color-warning)]"}`}
                    style={{ boxShadow: `0 0 8px ${hs.severity === "critical" ? "var(--color-critical)" : "var(--color-warning)"}` }} />
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] tracking-wide">
                      Grid ({hs.cell[0]},{hs.cell[1]})
                    </span>
                    <span className="text-[10px] text-[var(--color-text-tertiary)] ml-2 uppercase tracking-widest font-semibold">
                      {hs.persistent ? "🚨 DISPATCH" : hs.severity === "critical" ? "RED ZONE" : "ALERT ZONE"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <TickingNumber value={hs.count} className="mono-data text-sm font-bold text-[var(--color-text-primary)]" />
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">ppl</span>
                </div>
              </div>
            ))}
          </div>
        </SpotlightCard>
      )}

      {/* Movement Trends */}
      {movement && movement.trends.length > 0 && (
        <SpotlightCard className="p-6 pt-5" glowColor="rgba(251, 191, 36, 0.1)">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="stat-label">Crowd Movement</span>
            {movement.overall_direction !== "STATIC" && (
              <span className="ml-auto text-lg text-white" title={`Overall: ${movement.overall_direction}`}>
                {DIRECTION_ARROWS[movement.overall_direction] || "●"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
              <div className="stat-label text-[10px] mb-1">Direction</div>
              <div className="flex items-center gap-2">
                <span className="text-xl text-[var(--color-text-primary)]">{DIRECTION_ARROWS[movement.overall_direction] || "●"}</span>
                <DecryptedText animateOn="hover" text={movement.overall_direction} className="text-xs font-semibold text-[var(--color-text-secondary)]" />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
              <div className="stat-label text-[10px] mb-1">Avg Speed</div>
              <div className="flex items-baseline gap-1">
                <TickingNumber value={movement.avg_speed} className="stat-value text-lg text-[var(--color-text-primary)]" />
                <span className="text-[10px] text-[var(--color-text-tertiary)]">px/s</span>
              </div>
            </div>
          </div>

          {movement.convergence_zones.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--color-border)] relative z-10">
              <div className="stat-label text-[10px] mb-3 text-[var(--color-warning)]">⚠ Convergence Detected</div>
              {movement.convergence_zones.slice(0, 3).map((cz, i) => (
                <div key={`cz-${i}`} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[var(--color-warning-muted)] border border-[var(--color-warning)]/20 mb-2 transition-all hover:bg-[var(--color-warning-muted)]/60">
                  <span className="text-xs font-medium text-[var(--color-text-primary)] tracking-wide">
                    Grid ({cz.cell[0]},{cz.cell[1]})
                  </span>
                  <span className="text-[10px] text-[var(--color-warning)] font-semibold flex gap-1.5 items-center">
                    <TickingNumber value={cz.inflow_count} className="font-bold tabular-nums" /> incoming
                  </span>
                </div>
              ))}
            </div>
          )}
        </SpotlightCard>
      )}
    </div>
  );
}
