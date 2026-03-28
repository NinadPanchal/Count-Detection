"use client";
import { useState, useRef, useEffect } from "react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Toggle } from "@/components/ui/Toggle";
import { LiquidGauge } from "@/components/ui/LiquidGauge";

const ZONES = [
  { name: "Main Entrance", x: 5, y: 5, w: 45, h: 40, density: 65, count: 28 },
  { name: "Center Area", x: 25, y: 25, w: 50, h: 50, density: 82, count: 35 },
  { name: "Exit Area", x: 55, y: 55, w: 40, h: 40, density: 30, count: 12 },
  { name: "Stage Area", x: 10, y: 55, w: 40, h: 40, density: 90, count: 45 },
  { name: "Food Court", x: 60, y: 10, w: 35, h: 35, density: 45, count: 18 },
];

function getColor(density: number): string {
  if (density > 75) return "#FF4D4D";
  if (density > 50) return "#FFC857";
  return "#00FF9C";
}

export default function HeatmapPage() {
  const [showLabels, setShowLabels] = useState(true);
  const [show3D, setShow3D] = useState(false);
  const [pulseActive, setPulseActive] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw heatmap on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 500;
    ctx.fillStyle = "#0B1B2B";
    ctx.fillRect(0, 0, 800, 500);

    // Grid
    ctx.strokeStyle = "rgba(0,255,156,0.05)";
    for (let x = 0; x < 800; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 500); ctx.stroke(); }
    for (let y = 0; y < 500; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke(); }

    // Draw heat zones
    ZONES.forEach((zone) => {
      const cx = (zone.x + zone.w / 2) / 100 * 800;
      const cy = (zone.y + zone.h / 2) / 100 * 500;
      const r = Math.max(zone.w, zone.h) / 100 * 300;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const color = getColor(zone.density);

      if (zone.density > 75) {
        gradient.addColorStop(0, "rgba(255,77,77,0.5)");
        gradient.addColorStop(0.5, "rgba(255,77,77,0.2)");
        gradient.addColorStop(1, "rgba(255,77,77,0)");
      } else if (zone.density > 50) {
        gradient.addColorStop(0, "rgba(255,200,87,0.4)");
        gradient.addColorStop(0.5, "rgba(255,200,87,0.15)");
        gradient.addColorStop(1, "rgba(255,200,87,0)");
      } else {
        gradient.addColorStop(0, "rgba(0,255,156,0.3)");
        gradient.addColorStop(0.5, "rgba(0,255,156,0.1)");
        gradient.addColorStop(1, "rgba(0,255,156,0)");
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 500);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Density Heatmap</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">Real-time crowd density visualization</p>
        </div>
        <div className="flex items-center gap-4">
          <Toggle checked={showLabels} onChange={setShowLabels} label="Labels" />
          <Toggle checked={show3D} onChange={setShow3D} label="3D Terrain" />
          <Toggle checked={pulseActive} onChange={setPulseActive} label="Pulse Effect" />
        </div>
      </div>

      {/* Main Heatmap */}
      <GlowCard className="overflow-hidden">
        <div className="relative" style={{ perspective: show3D ? "800px" : "none" }}>
          <div style={{ transform: show3D ? "rotateX(35deg) rotateZ(-5deg) scale(0.85)" : "none", transition: "transform 0.8s ease", transformOrigin: "center center" }}>
            <div className="relative aspect-[16/10]">
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-xl" />

              {/* Zone overlays */}
              {ZONES.map((zone) => {
                const color = getColor(zone.density);
                return (
                  <div key={zone.name} className="absolute transition-all duration-500" style={{
                    left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%`,
                    border: `1px solid ${color}40`,
                    borderRadius: "12px",
                    background: `${color}08`,
                    boxShadow: pulseActive && zone.density > 75 ? `0 0 30px ${color}30` : "none",
                    animation: pulseActive && zone.density > 75 ? "breathing-glow 2s ease-in-out infinite" : "none",
                    ...(show3D ? { transform: `translateZ(${zone.density}px)` } : {}),
                  }}>
                    {showLabels && (
                      <div className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-semibold" style={{ background: "rgba(0,0,0,0.7)", color }}>
                        {zone.name} — {zone.count} ppl
                      </div>
                    )}
                    {/* Pressure waves for critical zones */}
                    {zone.density > 75 && pulseActive && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full animate-sonar" style={{ width: "60%", height: "60%", border: `2px solid ${color}`, opacity: 0.3 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Legend + Zone Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Legend */}
        <GlowCard className="p-5">
          <div className="stat-label mb-4">Density Legend</div>
          <div className="flex flex-col gap-3">
            {[
              { label: "Low Density (0–50%)", color: "#00FF9C", desc: "Safe for normal flow" },
              { label: "Moderate (50–75%)", color: "#FFC857", desc: "Monitor closely" },
              { label: "High Density (75–100%)", color: "#FF4D4D", desc: "Action required" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-8 h-3 rounded-full" style={{ background: `linear-gradient(90deg, ${item.color}40, ${item.color})` }} />
                <div>
                  <div className="text-xs font-semibold text-[var(--color-text-primary)]">{item.label}</div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)]">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        {/* Zone Gauges */}
        <GlowCard className="p-5">
          <div className="stat-label mb-4">Zone Density</div>
          <div className="flex justify-around flex-wrap gap-4">
            {ZONES.slice(0, 4).map((zone) => (
              <LiquidGauge key={zone.name} value={zone.density} size={70} label={zone.name.split(" ")[0]} />
            ))}
          </div>
        </GlowCard>
      </div>
    </div>
  );
}
