"use client";
import { useState, useEffect } from "react";
import { GlowCard } from "@/components/ui/GlowCard";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { RiskGauge } from "@/components/charts/RiskGauge";

export default function AnalyticsPage() {
  const [range, setRange] = useState("24h");
  const [liveData, setLiveData] = useState<any>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [anRes, alRes] = await Promise.all([
          fetch("http://localhost:8002/api/analytics"),
          fetch("http://localhost:8002/api/alerts")
        ]);
        const anData = await anRes.json();
        const alData = await alRes.json();
        setLiveData({ anData, alerts: alData.alerts });
      } catch (e) {
        console.error("Failed fetching live analytics:", e);
      }
    };

    fetchHistory();
    const int = setInterval(fetchHistory, 2000);
    return () => clearInterval(int);
  }, []);

  if (!liveData) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-[var(--color-text-tertiary)] animate-pulse">
        Gathering real-time analytical history from video stream...
      </div>
    );
  }

  const crowdData = liveData.anData.history || [];
  const zoneData = liveData.anData.zone_averages || [];
  const alertsList = liveData.alerts || [];

  const barData = zoneData.map((z: any) => ({ zone: z.id, current: Math.round(z.average), capacity: 40 }));
  const alertCounts = alertsList.reduce((acc: any, a: any) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {});
  
  const alertData = [
    { label: "Critical", value: alertCounts["critical"] || 0, color: "#FF4D4D" },
    { label: "Warning", value: alertCounts["warning"] || 0, color: "#FFC857" },
    { label: "Info", value: alertCounts["info"] || 0, color: "#00FF9C" },
  ];

  const avgCount = liveData.anData.average_count;
  const peakCount = liveData.anData.peak_count;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Analytics & Reports</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">Historical crowd analysis and trends</p>
        </div>
        <div className="flex gap-1.5">
          {(["1h", "6h", "24h", "7d"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-all ${range === r ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)] border border-[var(--color-border-accent)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Avg Count", value: avgCount, color: "#00FF9C" },
          { label: "Peak Count", value: peakCount, color: "#FF4D4D" },
          { label: "Total Alerts", value: alertData.reduce((a, d) => a + d.value, 0), color: "#FFC857" },
          { label: "Avg Density", value: `${Math.round(avgCount * 2)}%`, color: "#7B61FF" },
        ].map((s) => (
          <GlowCard key={s.label} className="p-4 text-center">
            <div className="stat-value text-2xl mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </GlowCard>
        ))}
      </div>

      {/* Main Line Chart */}
      <GlowCard className="p-6">
        <div className="stat-label mb-4">Crowd Count Over Time</div>
        <LineChart data={crowdData} width={900} height={280} color="#00FF9C" animated />
      </GlowCard>

      {/* Row 2: Bar + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlowCard className="p-6">
          <div className="stat-label mb-4">Zone Comparison</div>
          <BarChart data={barData} animated />
        </GlowCard>
        <GlowCard className="p-6">
          <div className="stat-label mb-4">Alert Breakdown</div>
          <DonutChart data={alertData} size={170} />
        </GlowCard>
      </div>

      {/* Row 3: Peak Hours + Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlowCard className="p-6">
          <div className="stat-label mb-4">Peak Hour Predictions</div>
          <div className="h-[200px] flex items-center justify-center text-[var(--color-text-tertiary)] border border-dashed border-[rgba(255,255,255,0.05)] rounded-xl">
            <div className="text-center">
              <span className="text-2xl mb-2 block">⏳</span>
              <p className="text-xs">Gathering enough stream data to formulate peak hour patterns...</p>
            </div>
          </div>
        </GlowCard>
        <GlowCard className="p-6 flex items-center justify-center">
          <RiskGauge value={62} size={220} label="Overall Risk Assessment" />
        </GlowCard>
      </div>

      {/* Print Report Button */}
      <div className="flex justify-end">
        <button onClick={() => window.print()} className="btn-neon text-xs cursor-pointer">📊 Print Full Report</button>
      </div>
    </div>
  );
}
