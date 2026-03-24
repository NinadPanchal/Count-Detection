"use client";

import { useState, useEffect } from "react";

interface VideoFeedProps {
  frame: string | null;
  heatmap: string | null;
  isConnected: boolean;
  densityLevel: string;
}

export default function VideoFeed({
  frame,
  heatmap,
  isConnected,
  densityLevel,
}: VideoFeedProps) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (frame) setIsLoading(false);
  }, [frame]);

  const currentFrame = showHeatmap && heatmap ? heatmap : frame;

  const getGlowClass = () => {
    if (densityLevel === "critical") return "glow-critical";
    if (densityLevel === "warning") return "glow-warning";
    return "";
  };

  return (
    <div className={`panel flex flex-col h-full overflow-hidden transition-all duration-700 ${getGlowClass()}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          {/* Camera icon */}
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-[var(--color-text-primary)] block leading-tight">
              Camera 01
            </span>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              Primary feed
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

      {/* Video frame */}
      <div className="video-container relative flex-1 min-h-0 bg-[var(--color-bg-base)]">
        {isLoading || !currentFrame ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="relative w-12 h-12 mx-auto mb-4">
                <div className="absolute inset-0 border-2 border-[var(--color-border)] rounded-full" />
                <div className="absolute inset-0 border-2 border-transparent border-t-[var(--color-accent)] rounded-full animate-spin" />
              </div>
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                {isConnected ? "Awaiting feed..." : "Disconnected"}
              </p>
              <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
                {isConnected ? "Connecting to camera stream" : "Check connection settings"}
              </p>
            </div>
          </div>
        ) : (
          <img
            src={`data:image/jpeg;base64,${currentFrame}`}
            alt="Live feed"
            className="w-full h-full object-contain bg-black"
            style={{ display: "block" }}
          />
        )}
      </div>
    </div>
  );
}
