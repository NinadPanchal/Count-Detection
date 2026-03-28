"use client";
import { useState, useMemo, useEffect } from "react";
import { GlowCard } from "@/components/ui/GlowCard";
import { RippleButton } from "@/components/ui/RippleButton";
import { GlitchText } from "@/components/ui/GlitchText";
import { SonarPing } from "@/components/ui/SonarPing";

type Severity = "all" | "critical" | "warning" | "info";

export default function AlertsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Severity>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("http://localhost:8002/api/alerts");
        const data = await res.json();
        setIncidents(data.alerts || []);
      } catch (err) {
        console.error("Failed to fetch live alerts");
      }
    };
    fetchAlerts();
    const int = setInterval(fetchAlerts, 2000);
    return () => clearInterval(int);
  }, []);

  const mergedIncidents = useMemo(() => {
    return incidents.map(inc => ({ ...inc, resolved: resolvedIds.has(inc.id) }));
  }, [incidents, resolvedIds]);

  const filtered = useMemo(() => {
    return mergedIncidents.filter((inc) => {
      if (filter !== "all" && inc.severity !== filter) return false;
      if (searchQuery && !inc.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [mergedIncidents, filter, searchQuery]);

  const resolveIncident = (id: string) => {
    setResolvedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const stats = {
    total: mergedIncidents.length,
    critical: mergedIncidents.filter((i) => i.severity === "critical").length,
    warning: mergedIncidents.filter((i) => i.severity === "warning").length,
    resolved: resolvedIds.size,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Alerts & Incidents</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">{stats.total} incidents • {stats.critical} critical</p>
        </div>
        <RippleButton variant="primary" className="text-xs" onClick={() => {
          const report = mergedIncidents.map((i) => `[${i.time}] ${i.severity.toUpperCase()} — ${i.message} (${i.zone || 'Global'})`).join("\n");
          const blob = new Blob([`CrowdSense AI — Incident Report\nGenerated: ${new Date().toLocaleString()}\n${"=".repeat(50)}\n\n${report}`], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = "incident_report.txt"; a.click();
        }}>
          📄 Export Report
        </RippleButton>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "#00FF9C" },
          { label: "Critical", value: stats.critical, color: "#FF4D4D" },
          { label: "Warning", value: stats.warning, color: "#FFC857" },
          { label: "Resolved", value: stats.resolved, color: "#7B61FF" },
        ].map((s) => (
          <GlowCard key={s.label} className="p-4 text-center">
            <div className="stat-value text-2xl mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </GlowCard>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {(["all", "critical", "warning", "info"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-all ${filter === f ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <input
          type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search incidents..." className="px-3 py-1.5 rounded-lg text-xs bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-border-accent)]"
        />
      </div>

      {/* Incident Timeline */}
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-[var(--color-border)]" />
        <div className="space-y-4">
          {filtered.map((incident, i) => {
            const isCrit = incident.severity === "critical";
            const color = isCrit ? "#FF4D4D" : incident.severity === "warning" ? "#FFC857" : "#00FF9C";
            return (
              <div key={incident.id} className={`relative pl-14 animate-slide-in-bottom ${incident.resolved ? "opacity-50" : ""}`} style={{ animationDelay: `${i * 60}ms` }}>
                {/* Timeline dot */}
                <div className="absolute left-[17px] top-4">
                  {isCrit && !incident.resolved ? <SonarPing size={16} color={color} /> : (
                    <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: color, background: `${color}20` }} />
                  )}
                </div>

                <GlowCard status={isCrit ? "critical" : incident.severity === "warning" ? "warning" : "safe"} className={`p-4 ${isCrit && !incident.resolved ? "animate-pulse-urgent" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`pill-badge text-[9px] py-0.5 px-2 ${isCrit ? "pill-critical" : incident.severity === "warning" ? "pill-warning" : "pill-safe"}`}>
                          {incident.severity}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] mono-data">{incident.id}</span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">{incident.zone || "System"}</span>
                        {incident.resolved && <span className="pill-badge pill-purple text-[9px] py-0.5 px-2">Resolved</span>}
                      </div>
                      <p className="text-sm text-[var(--color-text-primary)]">
                        {isCrit && !incident.resolved ? <GlitchText text={incident.message} /> : incident.message}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="mono-data text-[10px] text-[var(--color-text-tertiary)]">{incident.time}</span>
                      {!incident.resolved && (
                        <button onClick={() => resolveIncident(incident.id)} className="btn-ghost text-[10px] text-[var(--color-accent)] cursor-pointer hover:bg-[var(--color-accent-muted)]">
                          ✓ Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </GlowCard>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
