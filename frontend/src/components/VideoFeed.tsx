"use client";

import { useState, useEffect, useRef } from "react";
import type { FrameData } from "@/hooks/useWebSocket";

interface VideoFeedProps {
  isConnected: boolean;
  densityLevel: string;
  activeCameraName?: string;
}

export default function VideoFeed({
  isConnected,
  densityLevel,
  activeCameraName,
}: VideoFeedProps) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [hasFirstFrame, setHasFirstFrame] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // HTML5 Canvas Overlay Drawer - Direct DOM listener (Bypasses React lag)
  useEffect(() => {
    const handleCrowdFrame = (event: Event) => {
      const customEvent = event as CustomEvent<FrameData>;
      const data = customEvent.detail;
      
      if (!hasFirstFrame && data.frame) {
        setHasFirstFrame(true);
      }

      // 1. Directly update DOM Image Src
      if (imgRef.current) {
        const frameDataStr = showHeatmap ? (data.heatmap || data.frame) : data.frame;
        if (frameDataStr) {
          imgRef.current.src = `data:image/jpeg;base64,${frameDataStr}`;
        }
      }
      
      // 2. Directly update Canvas overlays natively
      if (!canvasRef.current || !imgRef.current || showHeatmap || !data.frame) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const natWidth = imgRef.current.naturalWidth || 1280;
      const natHeight = imgRef.current.naturalHeight || 720;
      
      if (canvas.width !== natWidth) canvas.width = natWidth;
      if (canvas.height !== natHeight) canvas.height = natHeight;
      ctx.clearRect(0, 0, natWidth, natHeight);

      // Draw Grid
      if (data.grid_density && data.grid_density.length > 0) {
        const rows = data.grid_density.length;
        const cols = data.grid_density[0].length;
        const cellW = natWidth / cols;
        const cellH = natHeight / rows;

        ctx.font = "bold 14px Inter, sans-serif";
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const count = data.grid_density[r][c];
            const x = c * cellW;
            const y = r * cellH;

            ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cellW, cellH);

            if (count > 0) {
              if (count >= 8) ctx.fillStyle = "rgba(255, 70, 70, 0.25)";
              else if (count >= 4) ctx.fillStyle = "rgba(255, 170, 50, 0.15)";
              else ctx.fillStyle = "rgba(80, 255, 120, 0.08)";
              ctx.fillRect(x, y, cellW, cellH);
              
              const text = count.toString();
              const tx = x + cellW / 2 - ctx.measureText(text).width / 2;
              const ty = y + cellH / 2 + 5;
              
              ctx.fillStyle = "rgba(0,0,0,0.8)";
              ctx.fillText(text, tx + 1, ty + 1);
              ctx.fillStyle = count >= 4 ? "#fff" : "rgba(200, 255, 200, 0.9)";
              ctx.fillText(text, tx, ty);
            }
          }
        }
      }

      // Draw Hotspots
      if (data.hotspots && data.hotspots.length > 0) {
        data.hotspots.forEach((hs: any) => {
          const [r, c] = hs.cell;
          const rows = data.grid_density?.length || 6;
          const cols = data.grid_density?.[0]?.length || 8;
          const cellW = natWidth / cols;
          const cellH = natHeight / rows;
          
          const cx = c * cellW + cellW / 2;
          const cy = r * cellH + cellH / 2;
          const radius = Math.min(cellW, cellH) * 0.35;

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(255, 60, 60, 0.35)";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#ff3b3b";
          ctx.stroke();
        });
      }

      // Draw Bounding Boxes
      if (data.detections && data.detections.length > 0) {
        const strokeColor = data.stats?.density_level === "critical" ? "#ff4a4a" 
                        : data.stats?.density_level === "warning" ? "#ffb020" 
                        : "#00e676";
        
        data.detections.forEach((det: any) => {
          const [x1, y1, x2, y2] = det.bbox;
          const w = x2 - x1;
          const h = y2 - y1;
          
          ctx.lineWidth = 2;
          ctx.strokeStyle = strokeColor;
          ctx.strokeRect(x1, y1, w, h);
          
          const label = `#${det.track_id}`;
          ctx.font = "bold 13px Inter, sans-serif";
          const txtMargin = 6;
          const textW = ctx.measureText(label).width;
          
          ctx.fillStyle = strokeColor;
          ctx.fillRect(x1 - 1, y1 - 22, textW + txtMargin * 2, 22);
          
          ctx.fillStyle = "#000";
          ctx.fillText(label, x1 + txtMargin - 1, y1 - 6);
        });
      }

      // Draw People Count overlay (top-left)
      const count = data.stats?.total_count ?? 0;
      const countText = `People: ${count}`;
      ctx.font = "bold 22px Inter, sans-serif";
      const countW = ctx.measureText(countText).width;
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(12, 12, countW + 20, 36);
      ctx.fillStyle = count > 30 ? "#ff4a4a" : count > 15 ? "#ffb020" : "#00e676";
      ctx.fillText(countText, 22, 38);
    };

    window.addEventListener("crowdFrame", handleCrowdFrame as EventListener);
    return () => window.removeEventListener("crowdFrame", handleCrowdFrame as EventListener);
  }, [showHeatmap, hasFirstFrame]); // Retain showHeatmap dependencies

  const getGlowClass = () => {
    if (densityLevel === "critical") return "glow-critical";
    if (densityLevel === "warning") return "glow-warning";
    return "";
  };

  return (
    <div className={`panel flex flex-col h-full overflow-hidden transition-all duration-700 ${getGlowClass()}`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] z-20 bg-[var(--color-bg-base)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-[var(--color-text-primary)] block leading-tight tracking-wider">
              {activeCameraName ? activeCameraName.toUpperCase() : "CAMERA FEED"}
            </span>
            <span className="text-[10px] text-[var(--color-accent)] font-mono uppercase tracking-[0.2em] font-semibold">
              {isConnected ? (activeCameraName ? `⬤ Streaming — ${activeCameraName}` : "⬤ Live — YOLOv8 Pipeline") : "Disconnected"}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`cursor-pointer transition-all duration-300 ${
            showHeatmap ? "btn-active" : "btn-minimal"
          }`}
        >
          {showHeatmap ? "Heatmap Active" : "Heatmap Overlay"}
        </button>
      </div>

      <div className="video-container relative flex-1 min-h-0 bg-[#06090e] overflow-hidden">
        {(!isConnected || !hasFirstFrame) ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="relative w-12 h-12 mx-auto mb-4">
                <div className="absolute inset-0 border-2 border-[var(--color-border)] rounded-full" />
                <div className="absolute inset-0 border-2 border-transparent border-t-[var(--color-accent)] rounded-full animate-spin" />
              </div>
              <p className="text-xs font-medium text-[var(--color-text-secondary)] tracking-widest uppercase">
                {isConnected ? "Awaiting visual stream..." : "Disconnected"}
              </p>
            </div>
          </div>
        ) : (
          <>
            <img
              ref={imgRef}
              alt="Live feed"
              className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-filter duration-700 ${showHeatmap ? 'focus-in' : ''}`}
            />
            {!showHeatmap && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
