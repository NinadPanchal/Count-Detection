"use client";
import { useState, useEffect, useMemo } from "react";
import { GlowCard } from "@/components/ui/GlowCard";
import { HologramCard } from "@/components/ui/HologramCard";
import { Typewriter } from "@/components/ui/Typewriter";
import { RiskGauge } from "@/components/charts/RiskGauge";
import { Slider } from "@/components/ui/Slider";
import { useWebSocket } from "@/hooks/useWebSocket";

const ZONES_MAP = [
  { id: "z1", name: "Main Entrance", x: 10, y: 15, w: 25, h: 30, predicted: 32, current: 28 },
  { id: "z2", name: "Center Area", x: 40, y: 25, w: 25, h: 35, predicted: 45, current: 35 },
  { id: "z3", name: "Exit Area", x: 70, y: 55, w: 25, h: 30, predicted: 15, current: 12 },
  { id: "z4", name: "Stage Area", x: 15, y: 60, w: 25, h: 30, predicted: 52, current: 45 },
  { id: "z5", name: "Food Court", x: 65, y: 10, w: 25, h: 25, predicted: 22, current: 18 },
];

const ARROWS: Record<string, string> = { N: "↑", NE: "↗", E: "→", SE: "↘", S: "↓", SW: "↙", W: "←", NW: "↖" };

export default function PredictionsPage() {
  const [timeFuture, setTimeFuture] = useState(15);
  const [stampedeRisk, setStampedeRisk] = useState(0);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [whatIf, setWhatIf] = useState<string | null>(null);

  const WS_URL = "ws://localhost:8002/ws/video";
  const { frameData } = useWebSocket(WS_URL);
  
  const movement = frameData?.movement;
  const totalCount = frameData?.stats?.total_count ?? 0;
  const liveZones = frameData?.stats?.zones ?? [];

  // Dynamic calculations based on REAL data
  useEffect(() => {
    let risk = (totalCount / 50) * 30; // base risk from density
    if (movement) {
      risk += movement.avg_speed * 5; // speed adds risk
      risk += (movement.convergence_zones?.length || 0) * 15; // convergence is critical
    }
    // Time slider projects risk into future
    const futureProjection = risk + (timeFuture * 0.5);
    setStampedeRisk(Math.min(99, Math.max(5, futureProjection)));
  }, [movement, totalCount, timeFuture]);

  // Map real current zones
  const liveZonesMap = ZONES_MAP.map((z, i) => {
    const currentCount = liveZones[i]?.count || 0;
    return { ...z, current: currentCount, predicted: Math.round(currentCount * (1 + (timeFuture / 100))) };
  });

  const flows = useMemo(() => {
    if (!movement || movement.overall_direction === "STATIC") return [];
    // Generate realistic arrow flow based on vector
    const volume = Math.round(totalCount * 0.2);
    if (volume < 1) return [];
    
    // Simulate directional flow map based on string output
    return [
      { from: "Main Entrance", to: "Center Area", volume: volume },
      { from: "Center Area", to: movement.overall_direction === "S" ? "Stage Area" : "Exit Area", volume: Math.floor(volume * 0.6) }
    ];
  }, [movement, totalCount]);

  const evacuationRoutes = useMemo(() => {
    const baseRoutes = [
      { id: "A", name: "North Alpha Exit", status: "safe", capacity: 50, estimatedTime: "2 mins" },
      { id: "B", name: "East Beta Exit", status: "safe", capacity: 30, estimatedTime: "4 mins" },
      { id: "C", name: "South Gamma Exit", status: "safe", capacity: 40, estimatedTime: "3 mins" },
    ];
    
    if (stampedeRisk > 70) {
      baseRoutes[0].status = "congested";
      baseRoutes[0].estimatedTime = "7 mins";
    } else if (stampedeRisk > 40) {
      baseRoutes[1].status = "congested";
    }
    
    return baseRoutes;
  }, [stampedeRisk]);

  const whatIfZones = whatIf ? liveZonesMap.map((z) => {
    if (z.name === whatIf) return { ...z, predicted: Math.round(z.predicted * 0.3) };
    return { ...z, predicted: Math.round(z.predicted * 1.15) };
  }) : liveZonesMap;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Predictions & Trends</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">AI-powered crowd movement forecasting</p>
        </div>
      </div>

      {/* Time Slider */}
      <GlowCard className="p-5">
        <div className="flex items-center gap-4">
          <span className="stat-label">Prediction Window</span>
          <div className="flex-1">
            <Slider value={timeFuture} min={5} max={60} step={5} onChange={setTimeFuture} label={`+${timeFuture} minutes from now`} />
          </div>
        </div>
      </GlowCard>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* Left: Zone Map with Flows */}
        <div className="space-y-5">
          <GlowCard className="p-5">
            <div className="stat-label mb-4">Predicted Crowd Distribution (+{timeFuture} min)</div>
            <div className="relative aspect-[16/10] rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
              {/* Grid */}
              <div className="absolute inset-0" style={{
                backgroundImage: `linear-gradient(rgba(0,255,156,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,156,0.03) 1px, transparent 1px)`,
                backgroundSize: "10% 10%",
              }} />

              {/* Zones */}
              {whatIfZones.map((zone) => {
                const color = zone.predicted > 40 ? "#FF4D4D" : zone.predicted > 25 ? "#FFC857" : "#00FF9C";
                const isDown = whatIf === zone.name;
                return (
                  <div key={zone.id} className={`absolute rounded-xl cursor-pointer transition-all duration-700 ${selectedZone === zone.id ? "ring-2 ring-[var(--color-accent)]" : ""}`}
                    style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%`, background: `${color}15`, border: `1px solid ${color}40` }}
                    onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="text-[10px] font-semibold text-[var(--color-text-primary)]">{zone.name}</div>
                      <div className="text-lg font-bold mt-1" style={{ color }}>{zone.predicted}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: zone.predicted > zone.current ? "#FF4D4D" : "#00FF9C" }}>
                        {zone.predicted > zone.current ? "📈" : "📉"} {zone.predicted > zone.current ? "+" : ""}{zone.predicted - zone.current}
                      </div>
                    </div>
                    {isDown && <div className="absolute inset-0 rounded-xl border-2 border-dashed border-[var(--color-accent)] animate-pulse-neon" />}
                  </div>
                );
              })}

              {/* Flow arrows */}
              {flows.map((flow, i) => {
                const from = ZONES_MAP.find((z) => z.name === flow.from);
                const to = ZONES_MAP.find((z) => z.name === flow.to);
                if (!from || !to) return null;
                const fx = from.x + from.w / 2;
                const fy = from.y + from.h / 2;
                const tx = to.x + to.w / 2;
                const ty = to.y + to.h / 2;
                return (
                  <svg key={i} className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                    <defs>
                      <marker id={`arrow-${i}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#7B61FF" opacity="0.7" />
                      </marker>
                    </defs>
                    <line x1={fx} y1={fy} x2={tx} y2={ty} stroke="#7B61FF" strokeWidth="0.5" opacity="0.4" markerEnd={`url(#arrow-${i})`} strokeDasharray="2,2">
                      <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.5s" repeatCount="indefinite" />
                    </line>
                    <text x={(fx + tx) / 2} y={(fy + ty) / 2 - 2} textAnchor="middle" fill="#7B61FF" fontSize="3" fontWeight="600">{flow.volume}p</text>
                  </svg>
                );
              })}
            </div>
          </GlowCard>

          {/* What-If Simulator */}
          <HologramCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🔮</span>
              <span className="text-[10px] font-semibold text-[var(--color-cyan)] uppercase tracking-widest">What-If Simulator</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-3">Select a zone to simulate closing/redirecting:</p>
            <div className="flex flex-wrap gap-2">
              {ZONES_MAP.map((z) => (
                <button key={z.id} onClick={() => setWhatIf(whatIf === z.name ? null : z.name)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-semibold cursor-pointer transition-all ${whatIf === z.name ? "bg-[var(--color-accent)] text-[var(--color-bg-base)]" : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)]"}`}
                >
                  {whatIf === z.name ? "🚫 " : ""}{z.name}
                </button>
              ))}
            </div>
            {whatIf && (
              <div className="mt-3 p-3 rounded-lg bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.15)] animate-slide-in-bottom">
                <Typewriter text={`Simulating: Close "${whatIf}" → Crowd redistributes to remaining zones. Predicted +15% load on adjacent zones.`} speed={20} className="text-xs text-[var(--color-text-primary)]" />
              </div>
            )}
          </HologramCard>
        </div>

        {/* Right: Stampede Risk + Evacuation */}
        <div className="space-y-5">
          <GlowCard status={stampedeRisk > 70 ? "critical" : stampedeRisk > 40 ? "warning" : "safe"} className="p-5">
            <div className="stat-label mb-3">Stampede Risk Detector</div>
            <div className="flex justify-center mb-4">
              <RiskGauge value={Math.round(stampedeRisk)} size={180} label="Stampede Risk" />
            </div>
            {stampedeRisk > 60 && (
              <div className="p-3 rounded-lg bg-[var(--color-critical-muted)] border border-[rgba(255,77,77,0.2)] animate-shake">
                <p className="text-xs text-[var(--color-critical)] font-semibold">⚠ Elevated stampede risk — crowd speed and convergence exceeding safe thresholds</p>
              </div>
            )}
          </GlowCard>

          {/* Crowd Forecast */}
          <GlowCard className="p-5">
            <div className="stat-label mb-3">Crowd Density Forecast</div>
            <div className="space-y-3">
              {[
                { time: "+15 min", change: "+12%", zone: "Gate A", icon: "📈", severity: "warning" },
                { time: "+30 min", change: "+25%", zone: "Center", icon: "🔴", severity: "critical" },
                { time: "+1 hour", change: "-8%", zone: "Exit", icon: "📉", severity: "safe" },
              ].map((f) => (
                <div key={f.time} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${f.severity === "critical" ? "bg-[var(--color-critical-muted)] border-[rgba(255,77,77,0.2)]" : f.severity === "warning" ? "bg-[var(--color-warning-muted)] border-[rgba(255,200,87,0.2)]" : "bg-[var(--color-safe-muted)] border-[rgba(0,255,156,0.2)]"}`}>
                  <span className="text-lg">{f.icon}</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-[var(--color-text-primary)]">{f.time}: {f.change} at {f.zone}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>

          {/* Evacuation Routes */}
          <GlowCard className="p-5">
            <div className="stat-label mb-3">Smart Evacuation Routes</div>
            <div className="space-y-2">
              {evacuationRoutes.map((route) => (
                <div key={route.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${route.status === "congested" ? "bg-[var(--color-warning-muted)] border-[rgba(255,200,87,0.2)]" : "bg-[rgba(0,255,156,0.03)] border-[rgba(0,255,156,0.1)]"}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: route.status === "congested" ? "rgba(255,200,87,0.2)" : "rgba(0,255,156,0.15)", color: route.status === "congested" ? "#FFC857" : "#00FF9C" }}>
                    {route.id}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-[var(--color-text-primary)]">{route.name}</div>
                    <div className="text-[10px] text-[var(--color-text-tertiary)]">{route.estimatedTime} • {route.capacity} capacity</div>
                  </div>
                  <span className={`pill-badge text-[9px] py-0.5 px-2 ${route.status === "congested" ? "pill-warning" : "pill-safe"}`}>{route.status}</span>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}
