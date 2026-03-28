"use client";
import { useState, useEffect } from "react";

interface TopBarProps {
  onToggleNightVision?: () => void;
  onEmergency?: () => void;
  onCommandPalette?: () => void;
  nightVision?: boolean;
  isConnected?: boolean;
}

export default function TopBar({ onToggleNightVision, onEmergency, onCommandPalette, nightVision, isConnected = false }: TopBarProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-[var(--color-border)]" style={{ background: "rgba(11,27,43,0.8)" }}>
      <div className="flex items-center justify-between px-6 py-3">
        {/* Search / Command Palette trigger */}
        <button
          onClick={onCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--color-bg-elevated)]"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-xs text-[var(--color-text-tertiary)]">Search commands...</span>
          <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-text-tertiary)] border border-[var(--color-border)] ml-4">⌘K</kbd>
        </button>

        <div className="flex items-center gap-2">
          {/* Night Vision Toggle */}
          <button
            onClick={onToggleNightVision}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-all ${nightVision ? "bg-[rgba(0,255,0,0.1)] text-[#00ff00] border border-[rgba(0,255,0,0.3)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
            NV
          </button>

          {/* System time */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <span className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">SYS</span>
            <span className="mono-data text-xs font-semibold text-[var(--color-text-primary)]">{time}</span>
          </div>

          {/* Live status */}
          {isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-safe-muted)] border border-[rgba(0,255,156,0.3)]" style={{ boxShadow: "0 0 15px rgba(0,255,156,0.15)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-safe)] animate-pulse-glow" style={{ boxShadow: "0 0 8px var(--color-safe)" }} />
              <span className="text-[11px] font-semibold text-[var(--color-safe)] uppercase tracking-wide">Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-tertiary)]" />
              <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">Offline</span>
            </div>
          )}

          {/* Emergency button */}
          <button
            onClick={onEmergency}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all hover:bg-[var(--color-critical)] hover:text-white"
            style={{ border: "1px solid var(--color-critical)", color: "var(--color-critical)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
              <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">SOS</span>
          </button>

          {/* Notification bell */}
          <button className="relative p-2 rounded-lg hover:bg-[var(--color-bg-elevated)] cursor-pointer transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-critical)]" style={{ boxShadow: "0 0 6px var(--color-critical)" }} />
          </button>
        </div>
      </div>
    </header>
  );
}
