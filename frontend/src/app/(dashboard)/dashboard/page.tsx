"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { Hotspot, MovementData } from "@/hooks/useWebSocket";
import VideoFeed from "@/components/VideoFeed";
import StatsPanel from "@/components/StatsPanel";
import AlertPanel from "@/components/AlertPanel";
import DevicePanel from "@/components/DevicePanel";
import { GlowCard } from "@/components/ui/GlowCard";
import { SonarPing } from "@/components/ui/SonarPing";
import { RiskGauge } from "@/components/charts/RiskGauge";
import { Sparkline } from "@/components/charts/Sparkline";
import { CrowdCounter3D } from "@/components/features/CrowdCounter3D";
import { CrowdDNA } from "@/components/features/CrowdDNA";
import { RadarSweep } from "@/components/features/RadarSweep";
import { CrowdSentiment } from "@/components/features/CrowdSentiment";
import { DataStreamTerminal } from "@/components/features/DataStreamTerminal";
import { ZoneCapacityBars } from "@/components/features/ZoneCapacityBars";
import { Typewriter } from "@/components/ui/Typewriter";
import { HologramCard } from "@/components/ui/HologramCard";
import { LiquidGauge } from "@/components/ui/LiquidGauge";
import { AI_SUGGESTIONS } from "@/lib/mockData";

const BACKEND_BASE = "ws://localhost:8002";

interface ActiveCamera {
  id: string;
  name: string;
  path: string;
  switchedAt: number;
}

export default function DashboardPage() {
  const [activeSource, setActiveSource] = useState("local");
  const [activeCamera, setActiveCamera] = useState<ActiveCamera | null>(null);

  // Load active camera info from localStorage (set by monitoring page)
  useEffect(() => {
    const stored = localStorage.getItem("crowdsense-active-camera");
    if (stored) {
      try {
        const cam: ActiveCamera = JSON.parse(stored);
        setActiveCamera(cam);
      } catch {
        // ignore parse errors
      }
    }

    // Listen for storage changes from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "crowdsense-active-camera" && e.newValue) {
        try {
          setActiveCamera(JSON.parse(e.newValue));
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Dynamically build WS URL based on selected source
  const wsUrl = useMemo(() => {
    if (activeSource === "local") {
      return `${BACKEND_BASE}/ws/video`;
    }
    // External device — subscribe to its processed feed
    return `${BACKEND_BASE}/ws/feed/${activeSource}`;
  }, [activeSource]);

  const { frameData, alerts, isConnected, error, reconnect } = useWebSocket(wsUrl);
  const [sparkData, setSparkData] = useState<number[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);

  const stats = frameData?.stats;
  const totalCount = stats?.total_count ?? 0;
  const densityLevel = stats?.density_level ?? "safe";
  const zones = stats?.zones ?? [];
  const hotspots: Hotspot[] = frameData?.hotspots ?? [];
  const movement: MovementData | null = frameData?.movement ?? null;

  // Update sparkline with real data
  useEffect(() => {
    if (totalCount > 0) {
      setSparkData((prev) => [...prev.slice(-29), totalCount]);
    }
  }, [totalCount]);

  // Cycle AI suggestions
  useEffect(() => {
    const timer = setInterval(() => setActiveSuggestion((s) => (s + 1) % AI_SUGGESTIONS.length), 6000);
    return () => clearInterval(timer);
  }, []);

  // Smoothed risk score — uses EMA so it never janks/resets
  const smoothedRiskRef = useRef(0);
  const riskScore = useMemo(() => {
    let rawScore = (totalCount / 50) * 40;
    if (densityLevel === "warning") rawScore += 20;
    if (densityLevel === "critical") rawScore += 40;
    rawScore += hotspots.length * 5;
    rawScore = Math.min(100, Math.round(rawScore));
    
    // EMA smoothing: 70% previous + 30% new → prevents jittery jumps
    const alpha = 0.3;
    smoothedRiskRef.current = Math.round(
      smoothedRiskRef.current * (1 - alpha) + rawScore * alpha
    );
    return smoothedRiskRef.current;
  }, [totalCount, densityLevel, hotspots]);

  const threats = hotspots.map((h) => ({
    x: h.norm_coords ? (h.norm_coords[0] + h.norm_coords[2]) / 2 : 0.5,
    y: h.norm_coords ? (h.norm_coords[1] + h.norm_coords[3]) / 2 : 0.5,
    severity: h.severity,
  }));

  const zoneCapacities = [
    { name: "Main Entrance", count: zones[0]?.count ?? 8, capacity: 30 },
    { name: "Center", count: zones[1]?.count ?? 15, capacity: 40 },
    { name: "Exit Area", count: zones[2]?.count ?? 5, capacity: 25 },
    { name: "Stage", count: Math.round(totalCount * 0.3), capacity: 35 },
    { name: "Food Court", count: Math.round(totalCount * 0.15), capacity: 20 },
  ];

  // Source change handler — reconnects the WebSocket
  const handleSourceChange = useCallback((source: string) => {
    setActiveSource(source);
  }, []);

  // Clear active camera and switch back to default
  const handleClearActiveCamera = useCallback(async () => {
    localStorage.removeItem("crowdsense-active-camera");
    setActiveCamera(null);
    // Optionally switch back to default video source
    try {
      await fetch("http://localhost:8002/api/video/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: "sample_video/crowd.mp4" }),
      });
    } catch { /* ignore */ }
  }, []);

  // Derive the HTTP base for the DevicePanel
  const backendHttpBase = BACKEND_BASE.replace(/^ws/, "http");

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between px-5 py-3 rounded-2xl bg-[var(--color-critical-muted)] border border-[rgba(255,77,77,0.2)] animate-fade-in">
          <span className="text-sm font-medium text-[var(--color-critical)]">{error} — attempting to reconnect...</span>
          <button onClick={reconnect} className="btn-minimal cursor-pointer">Retry</button>
        </div>
      )}

      {/* Active Camera Stream Banner */}
      {activeCamera && (
        <div 
          className="flex items-center justify-between px-5 py-3.5 rounded-2xl animate-fade-in"
          style={{ 
            background: "linear-gradient(135deg, rgba(0,255,156,0.08), rgba(123,97,255,0.08))", 
            border: "1px solid rgba(0,255,156,0.2)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-[#00FF9C]" style={{ boxShadow: "0 0 12px rgba(0,255,156,0.6)" }} />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-[#00FF9C] animate-ping opacity-40" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#00FF9C] uppercase tracking-wider">
                🎥 Streaming: {activeCamera.name}
              </span>
              <span className="text-[10px] text-[var(--color-text-tertiary)] ml-2 font-mono">
                {activeCamera.path}
              </span>
            </div>
          </div>
          <button 
            onClick={handleClearActiveCamera} 
            className="text-[11px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors px-3 py-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)]"
          >
            ✕ Switch to Default
          </button>
        </div>
      )}

      {/* Row 1: Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 3D Flip Counter */}
        <GlowCard status={densityLevel === "critical" ? "critical" : densityLevel === "warning" ? "warning" : "safe"} className="p-5">
          <div className="stat-label mb-3 flex items-center gap-2">
            <SonarPing size={16} color={densityLevel === "critical" ? "#FF4D4D" : densityLevel === "warning" ? "#FFC857" : "#00FF9C"} />
            People Detected
          </div>
          <CrowdCounter3D value={totalCount} />
          <div className="mt-3">
            <Sparkline data={sparkData} color={densityLevel === "critical" ? "#FF4D4D" : "#00FF9C"} />
          </div>
        </GlowCard>

        {/* Risk Gauge */}
        <GlowCard status={riskScore > 70 ? "critical" : riskScore > 40 ? "warning" : "safe"} className="p-5 flex items-center justify-center">
          <RiskGauge value={riskScore} size={160} label="Crowd Risk" />
        </GlowCard>

        {/* Crowd Sentiment */}
        <GlowCard status="purple" className="p-5 flex items-center justify-center">
          <CrowdSentiment
            speed={movement?.avg_speed ?? 0}
            density={totalCount * 2}
            convergence={(movement?.convergence_zones?.length ?? 0) * 20}
          />
        </GlowCard>

        {/* Crowd DNA */}
        <GlowCard status="default" className="p-5 flex items-center justify-center">
          <CrowdDNA
            count={totalCount}
            density={stats?.avg_density ?? 0}
            direction={movement?.overall_direction ?? "STATIC"}
            zones={zones.map((z) => z.count)}
          />
        </GlowCard>
      </div>

      {/* Row 2: Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* Left: Video + Zones */}
        <div className="space-y-5">
          {/* Source indicator */}
          {activeSource !== "local" && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl animate-fade-in" style={{ background: "rgba(123,97,255,0.1)", border: "1px solid rgba(123,97,255,0.25)" }}>
              <div className="w-2 h-2 rounded-full bg-[#7B61FF] animate-pulse-glow" />
              <span className="text-xs font-semibold text-[#7B61FF]">
                Viewing External Device: {activeSource.slice(0, 8)}...
              </span>
              <button onClick={() => setActiveSource("local")} className="ml-auto text-[10px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors">
                ← Back to Local
              </button>
            </div>
          )}

          <VideoFeed isConnected={isConnected} densityLevel={densityLevel} activeCameraName={activeCamera?.name} />

          {/* Zone Capacity + Radar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <GlowCard className="p-5">
              <div className="stat-label mb-4">Zone Capacity</div>
              <ZoneCapacityBars zones={zoneCapacities} />
            </GlowCard>
            <GlowCard className="p-5 flex items-center justify-center">
              <RadarSweep threats={threats} size={200} />
            </GlowCard>
          </div>

          {/* AI Suggestions */}
          <HologramCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🤖</span>
              <span className="text-[10px] font-semibold text-[var(--color-cyan)] uppercase tracking-widest">AI Recommendation</span>
            </div>
            <div className="min-h-[28px]">
              <Typewriter
                key={activeSuggestion}
                text={`${AI_SUGGESTIONS[activeSuggestion].icon} ${AI_SUGGESTIONS[activeSuggestion].text}`}
                speed={25}
                className="text-sm text-[var(--color-text-primary)]"
              />
            </div>
            <div className="flex gap-1 mt-3">
              {AI_SUGGESTIONS.map((_, i) => (
                <div key={i} className="h-1 flex-1 rounded-full transition-all duration-500" style={{ background: i === activeSuggestion ? "var(--color-cyan)" : "rgba(255,255,255,0.06)" }} />
              ))}
            </div>
          </HologramCard>

          {/* Data Stream Terminal */}
          <DataStreamTerminal />
        </div>

        {/* Right: Stats + Alerts + Devices */}
        <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
          <StatsPanel
            totalCount={totalCount}
            densityLevel={densityLevel}
            avgDensity={stats?.avg_density ?? 0}
            peakCount={stats?.peak_count ?? 0}
            zones={zones}
            hotspots={hotspots}
            movement={movement}
            isConnected={isConnected}
          />

          {/* Liquid gauges row */}
          <GlowCard className="p-5">
            <div className="stat-label mb-4">System Metrics</div>
            <div className="flex justify-around">
              <LiquidGauge value={Math.min(100, totalCount * 2)} size={80} label="Density" />
              <LiquidGauge value={Math.min(100, (stats?.fps ?? 0) * 4)} size={80} label="FPS" />
              <LiquidGauge value={riskScore} size={80} label="Risk" />
            </div>
          </GlowCard>

          {/* Device Panel with QR Code */}
          <DevicePanel
            activeSource={activeSource}
            onSourceChange={handleSourceChange}
            backendUrl={`${BACKEND_BASE}/ws/video`}
          />

          <AlertPanel alerts={alerts} isConnected={isConnected} />
        </div>
      </div>
    </div>
  );
}
