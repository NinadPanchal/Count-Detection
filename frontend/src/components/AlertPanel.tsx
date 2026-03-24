"use client";

import { useEffect, useRef, useState } from "react";

interface Alert {
  id: string;
  type: string;
  severity: string;
  message: string;
  count?: number;
  time_str: string;
  timestamp: number;
}

interface AlertPanelProps {
  alerts: (Alert | undefined)[];
  isConnected: boolean;
}

export default function AlertPanel({ alerts, isConnected }: AlertPanelProps) {
  const [visibleAlerts, setVisibleAlerts] = useState<Alert[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const filtered = alerts.filter((a): a is Alert => a !== undefined);
    setVisibleAlerts(filtered.slice(0, 15));
  }, [alerts]);

  const getPillClass = (type: string) => {
    if (type === "dispatch") return "pill-dispatch";
    if (type === "critical") return "pill-critical";
    if (type === "hotspot") return "pill-critical";
    if (type === "warning") return "pill-warning";
    if (type === "convergence") return "pill-warning";
    return "pill-safe";
  };

  const getLabel = (type: string) => {
    if (type === "dispatch") return "🚨 Dispatch";
    if (type === "critical") return "Critical";
    if (type === "hotspot") return "Hotspot";
    if (type === "warning") return "Warning";
    if (type === "convergence") return "Trend";
    if (type === "resolved") return "Resolved";
    return "Info";
  };

  return (
    <div className="panel flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            System Log
          </h2>
        </div>
        {visibleAlerts.length > 0 && (
          <span className="text-[10px] font-medium mono-data text-[var(--color-text-tertiary)] bg-[var(--color-bg-elevated)] px-2.5 py-1 rounded-full border border-[var(--color-border)]">
            {visibleAlerts.length} entries
          </span>
        )}
      </div>

      {/* Alert List */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {visibleAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center h-full">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">No active alerts</p>
            <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">System running normally</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {visibleAlerts.map((alert, index) => (
              <div
                key={alert.id}
                className={`animate-slide-in-bottom flex items-start gap-3 px-5 py-3.5 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]/50 transition-colors ${
                  alert.type === "dispatch" ? "bg-[var(--color-critical-muted)]/30" : ""
                }`}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* Severity pill */}
                <div className="flex-shrink-0 mt-0.5">
                  <span className={`pill-badge text-[9px] py-0.5 px-2 ${getPillClass(alert.type)}`}>
                    {getLabel(alert.type)}
                  </span>
                </div>

                {/* Message */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-relaxed ${
                    alert.type === "dispatch" ? "text-[var(--color-critical)] font-semibold" : "text-[var(--color-text-primary)]"
                  }`}>
                    {alert.message}
                  </p>
                </div>

                {/* Timestamp */}
                <div className="flex-shrink-0 mono-data text-[10px] text-[var(--color-text-tertiary)] opacity-70 mt-0.5">
                  {alert.time_str}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
