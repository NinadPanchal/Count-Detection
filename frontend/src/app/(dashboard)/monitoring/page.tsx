"use client";
import { useState } from "react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { SonarPing } from "@/components/ui/SonarPing";
import DevicePanel from "@/components/DevicePanel";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface VideoData {
  id: string;
  name: string;
  path: string;
  size_mb: number;
  status: string;
}

export default function MonitoringPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, {frame: string, count: number}>>({});

  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [aiDetection, setAiDetection] = useState(true);
  const [thermalView, setThermalView] = useState(false);

  useEffect(() => {
    // Fetch available videos from backend
    fetch("http://localhost:8002/api/videos")
      .then(res => res.json())
      .then(data => {
        if (data.videos) {
          setVideos(data.videos);
        }
        if (data.active) {
          setActiveSource(data.active);
        }
      })
      .catch(err => console.error("Failed to fetch videos:", err));

    const interval = setInterval(() => {
      fetch("http://localhost:8002/api/videos/live")
        .then(res => res.json())
        .then(data => setPreviews(data))
        .catch(err => console.error("Failed to fetch live previews:", err));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectSource = async (camera: VideoData) => {
    try {
      const res = await fetch("http://localhost:8002/api/video/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: camera.path }),
      });
      const data = await res.json();
      if (data.status === "success") {
        // Store active camera info so dashboard can display it
        localStorage.setItem("crowdsense-active-camera", JSON.stringify({
          id: camera.id,
          name: camera.name,
          path: camera.path,
          switchedAt: Date.now(),
        }));
        setActiveSource(data.active);
        router.push("/dashboard");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cam = videos.find((c) => c.id === selectedCamera);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Live Monitoring</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">{videos.length} feeds available</p>
        </div>
        <div className="flex items-center gap-4">
          <Toggle checked={aiDetection} onChange={setAiDetection} label="AI Detection" />
          <Toggle checked={thermalView} onChange={setThermalView} label="Thermal View" />
        </div>
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {videos.map((camera, i) => {
          const isActive = `sample_video/${camera.name}` === activeSource || camera.path === activeSource;
          const liveData = previews[camera.id];
          const hasFrame = !!liveData?.frame;
          const bgStyle = hasFrame && !thermalView && aiDetection
            ? { backgroundImage: `url(data:image/jpeg;base64,${liveData.frame})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: thermalView ? "linear-gradient(135deg, #001, #200, #010)" : "rgba(0,0,0,0.5)" };
          
          return (
            <GlowCard
              key={camera.id}
              status={isActive ? "safe" : (hasFrame && liveData.count > 10) ? "warning" : "default"}
              className={`overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] animate-slide-in-bottom ${isActive ? "ring-1 ring-[var(--color-cyan)]" : ""}`}
            >
              <div
                className="relative aspect-video flex items-center justify-center"
                style={bgStyle}
                onClick={() => handleSelectSource(camera)}
              >
                <>
                  {(!hasFrame || !aiDetection) && (
                    <div className="absolute inset-0" style={{
                      backgroundImage: `linear-gradient(rgba(0,255,156,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,156,0.03) 1px, transparent 1px)`,
                      backgroundSize: "40px 40px",
                    }} />
                  )}

                  {hasFrame && aiDetection && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
                      <span className="text-xs font-bold" style={{ color: "#00FF9C" }}>{liveData.count} detected</span>
                    </div>
                  )}

                  {/* Status indicator */}
                  <div className="absolute top-3 right-3">
                    <SonarPing size={16} color={isActive ? "#00FF9C" : "#7B61FF"} />
                  </div>
                  {/* Click to expand hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.4)" }}>
                    <span className="text-xs font-semibold text-white tracking-wider uppercase">Stream on Dashboard</span>
                  </div>
                </>
              </div>
              {/* Camera info bar */}
              <div className="px-4 py-3 flex items-center justify-between border-t border-[var(--color-border)]">
                <div>
                  <div className="text-xs font-semibold text-[var(--color-text-primary)]">{camera.name}</div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)]">{camera.size_mb} MB  {isActive ? "• ACTIVE FEED" : ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isActive ? "bg-[var(--color-safe)] animate-pulse-glow" : "bg-[#7B61FF]"}`}
                    style={{ boxShadow: isActive ? "0 0 6px var(--color-safe)" : "none" }}
                  />
                </div>
              </div>
            </GlowCard>
          );
        })}
      </div>

      {/* Device Panel — QR Code */}
      <DevicePanel activeSource="local" onSourceChange={() => {}} backendUrl={process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8002/ws/video"} />

      {/* Camera Network Topology */}
      <GlowCard className="p-6">
        <div className="stat-label mb-4">Camera Network Topology</div>
        <div className="relative h-[200px]">
          <svg width="100%" height="100%" viewBox="0 0 600 200">
            {/* Central node */}
            <circle cx="300" cy="100" r="20" fill="rgba(123,97,255,0.15)" stroke="#7B61FF" strokeWidth="1.5" />
            <text x="300" y="104" textAnchor="middle" fill="#7B61FF" fontSize="9" fontWeight="600">SERVER</text>
            {/* Camera nodes */}
            {videos.map((c, i) => {
              const angle = (i / Math.max(1, videos.length)) * Math.PI * 2 - Math.PI / 2;
              const rx = 200, ry = 70;
              const x = 300 + rx * Math.cos(angle);
              const y = 100 + ry * Math.sin(angle);
              const isActive = `sample_video/${c.name}` === activeSource || c.path === activeSource;
              const color = isActive ? "#00FF9C" : "#7B61FF";
              return (
                <g key={c.id}>
                  <line x1="300" y1="100" x2={x} y2={y} stroke={color} strokeWidth="1" opacity="0.4" strokeDasharray={isActive ? "none" : "2,2"} />
                  <circle cx={x} cy={y} r="14" fill={`${color}15`} stroke={color} strokeWidth="1.5" />
                  <text x={x} y={y - 20} textAnchor="middle" fill="var(--color-text-secondary)" fontSize="9" fontWeight="500">{c.name.slice(0, 10)}</text>
                  <text x={x} y={y + 4} textAnchor="middle" fill={color} fontSize="8" fontWeight="700">{isActive ? "ON" : "STB"}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </GlowCard>

      {/* Fullscreen Modal */}
      <Modal isOpen={!!selectedCamera} onClose={() => setSelectedCamera(null)} title={cam?.name ?? "Camera Feed"} size="lg">
        <div className="aspect-video rounded-xl overflow-hidden relative" style={{ background: thermalView ? "linear-gradient(135deg, #001, #200, #010)" : "rgba(0,0,0,0.5)" }}>
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(0,255,156,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,156,0.03) 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }} />
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(0,0,0,0.7)", color: "#00FF9C" }}>
            {cam?.name} — Local File — {cam?.size_mb} MB
          </div>
          <div className="absolute bottom-4 right-4 animate-pulse-glow">
            <SonarPing size={24} color={"#00FF9C"} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
