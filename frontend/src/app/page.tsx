"use client";

import { useWebSocket } from "@/hooks/useWebSocket";
import Header from "@/components/Header";
import VideoFeed from "@/components/VideoFeed";
import StatsPanel from "@/components/StatsPanel";
import AlertPanel from "@/components/AlertPanel";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/video";

export default function Dashboard() {
  const { frameData, alerts, isConnected, error, reconnect } =
    useWebSocket(WS_URL);

  const stats = frameData?.stats;
  const frame = frameData?.frame ?? null;
  const heatmap = frameData?.heatmap ?? null;

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] bg-grid-pattern flex flex-col font-sans">
      <Header
        isConnected={isConnected}
        fps={stats?.fps ?? 0}
        time={stats?.time_str ?? ""}
      />

      <main className="flex-1 p-5 lg:p-8 flex flex-col gap-5 lg:gap-6 max-w-[1600px] w-full mx-auto">
        {error && (
          <div className="flex items-center justify-between px-5 py-3 rounded-2xl bg-[var(--color-critical-muted)] border border-[rgba(248,113,113,0.2)] animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-critical-muted)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-critical)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <span className="text-sm font-medium text-[var(--color-critical)]">
                {error} — attempting to reconnect...
              </span>
            </div>
            <button
              onClick={reconnect}
              className="btn-minimal cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 lg:gap-6 min-h-0">
          {/* Left: Video */}
          <div className="min-h-[400px] lg:min-h-0">
            <VideoFeed
              frame={frame}
              heatmap={heatmap}
              isConnected={isConnected}
              densityLevel={stats?.density_level ?? "safe"}
            />
          </div>

          {/* Right: Sidebar */}
          <div className="flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-120px)] pr-1">
            <StatsPanel
              totalCount={stats?.total_count ?? 0}
              densityLevel={stats?.density_level ?? "safe"}
              avgDensity={stats?.avg_density ?? 0}
              peakCount={stats?.peak_count ?? 0}
              zones={stats?.zones ?? []}
              isConnected={isConnected}
            />
            
            <div className="flex-1 min-h-[300px]">
              <AlertPanel alerts={alerts} isConnected={isConnected} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
