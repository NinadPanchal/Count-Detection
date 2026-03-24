"use client";

import { useEffect, useState } from "react";

interface Device {
  id: string;
  name: string;
  connected_at: number;
  last_frame_at: number;
  frame_count: number;
  is_active: boolean;
  uptime: number;
}

interface DevicePanelProps {
  activeSource: string;
  onSourceChange: (source: string) => void;
  backendUrl: string;
}

export default function DevicePanel({
  activeSource,
  onSourceChange,
  backendUrl,
}: DevicePanelProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [qrBlobUrl, setQrBlobUrl] = useState<string | null>(null);
  const [connectUrl, setConnectUrl] = useState<string>("");

  const apiBase = backendUrl.replace(/^ws/, "http").replace(/\/ws\/.*$/, "");

  // Fetch QR code as blob
  useEffect(() => {
    const loadQr = async () => {
      try {
        const res = await fetch(`${apiBase}/api/qrcode`);
        if (res.ok) {
          const blob = await res.blob();
          setQrBlobUrl(URL.createObjectURL(blob));
        }
      } catch {
        // Backend might not be up
      }
      try {
        const res = await fetch(`${apiBase}/api/qrcode-url`);
        if (res.ok) {
          const data = await res.json();
          setConnectUrl(data.url || "");
        }
      } catch {}
    };
    loadQr();
  }, [apiBase]);

  // Poll device list every 3 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${apiBase}/api/devices`);
        const data = await res.json();
        setDevices(data.devices || []);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [apiBase]);

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  };

  return (
    <div className="panel p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-accent-muted)] border border-[var(--color-border-accent)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <span className="stat-label">Camera Sources</span>
        </div>
        {devices.length > 0 && (
          <span className="text-[10px] font-semibold mono-data text-[var(--color-accent)] bg-[var(--color-accent-muted)] px-2.5 py-1 rounded-full border border-[var(--color-border-accent)]">
            {devices.length} connected
          </span>
        )}
      </div>

      {/* Local source */}
      <button
        onClick={() => onSourceChange("local")}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 mb-2 cursor-pointer ${
          activeSource === "local"
            ? "bg-[var(--color-accent-muted)] border-[var(--color-border-accent)]"
            : "bg-[var(--color-bg-elevated)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[var(--color-safe)]"
            style={{ boxShadow: activeSource === "local" ? "0 0 8px var(--color-safe)" : "none" }} />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">Local Camera / Video</span>
        </div>
        {activeSource === "local" && (
          <span className="pill-badge pill-safe text-[8px] py-0.5 px-1.5">Active</span>
        )}
      </button>

      {/* Connected devices */}
      {devices.map((dev) => (
        <button
          key={dev.id}
          onClick={() => onSourceChange(dev.id)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 mb-2 cursor-pointer ${
            activeSource === dev.id
              ? "bg-[var(--color-accent-muted)] border-[var(--color-border-accent)]"
              : "bg-[var(--color-bg-elevated)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]"
              style={{ boxShadow: "0 0 8px var(--color-accent)" }} />
            <div className="text-left">
              <span className="text-xs font-semibold text-[var(--color-text-primary)] block">{dev.name}</span>
              <span className="text-[10px] text-[var(--color-text-tertiary)]">
                {formatUptime(dev.uptime)} · {dev.frame_count} frames
              </span>
            </div>
          </div>
          {activeSource === dev.id && (
            <span className="pill-badge pill-safe text-[8px] py-0.5 px-1.5">Active</span>
          )}
        </button>
      ))}

      {/* QR Code */}
      <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
        <div className="text-center">
          <p className="stat-label text-[10px] mb-3">Scan to connect a device</p>
          <div className="inline-block p-2 rounded-xl bg-[#0c1220] border border-[var(--color-border)]">
            {qrBlobUrl ? (
              <img src={qrBlobUrl} alt="QR Code" width={160} height={160} className="rounded-lg" />
            ) : (
              <div className="w-[160px] h-[160px] flex items-center justify-center">
                <span className="text-[10px] text-[var(--color-text-tertiary)]">Loading QR...</span>
              </div>
            )}
          </div>
          {connectUrl && (
            <p className="text-[9px] text-[var(--color-text-tertiary)] mt-2 leading-relaxed break-all px-2 mono-data">
              {connectUrl}
            </p>
          )}
          <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">Same WiFi network required</p>
        </div>
      </div>
    </div>
  );
}
