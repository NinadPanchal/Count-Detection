"use client";
import { useState } from "react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Toggle } from "@/components/ui/Toggle";
import { Slider } from "@/components/ui/Slider";
import { RippleButton } from "@/components/ui/RippleButton";
import { useTheme, ThemeMode } from "@/hooks/useTheme";
import { ALARM_PRESETS } from "@/lib/audioEngine";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [warningThreshold, setWarningThreshold] = useState(15);
  const [criticalThreshold, setCriticalThreshold] = useState(30);
  const [alertSensitivity, setAlertSensitivity] = useState(50);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoDispatch, setAutoDispatch] = useState(false);
  const [heatmapOverlay, setHeatmapOverlay] = useState(true);
  const [aiDetection, setAiDetection] = useState(true);
  const [showBboxes, setShowBboxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [targetFps, setTargetFps] = useState(24);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Settings</h1>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">Configure thresholds, cameras, and system preferences</p>
      </div>

      {/* Theme */}
      <GlowCard className="p-6">
        <div className="stat-label mb-4">Appearance</div>
        <div className="grid grid-cols-3 gap-3">
          {([
            { mode: "default" as ThemeMode, label: "Dark Mode", desc: "Standard command center", icon: "🌑" },
            { mode: "nightvision" as ThemeMode, label: "Night Vision", desc: "Green tinted goggles", icon: "🌙" },
            { mode: "thermal" as ThemeMode, label: "Thermal", desc: "Heat signature view", icon: "🔥" },
          ]).map((t) => (
            <button key={t.mode} onClick={() => setTheme(t.mode)} className={`p-4 rounded-xl text-left cursor-pointer transition-all ${theme === t.mode ? "ring-2 ring-[var(--color-accent)]" : "hover:bg-[var(--color-bg-hover)]"}`}
              style={{ background: theme === t.mode ? "rgba(0,255,156,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${theme === t.mode ? "rgba(0,255,156,0.2)" : "rgba(255,255,255,0.04)"}` }}
            >
              <div className="text-2xl mb-2">{t.icon}</div>
              <div className="text-xs font-semibold text-[var(--color-text-primary)]">{t.label}</div>
              <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </GlowCard>

      {/* Density Thresholds */}
      <GlowCard className="p-6">
        <div className="stat-label mb-5">Density Thresholds</div>
        <div className="space-y-6">
          <Slider value={warningThreshold} min={5} max={40} onChange={setWarningThreshold} label="⚠️ Warning Threshold (people)" />
          <Slider value={criticalThreshold} min={10} max={60} onChange={setCriticalThreshold} label="🔴 Critical Threshold (people)" />
          <Slider value={alertSensitivity} min={0} max={100} onChange={setAlertSensitivity} label="🎚 Alert Sensitivity" />
        </div>
      </GlowCard>

      {/* Detection Settings */}
      <GlowCard className="p-6">
        <div className="stat-label mb-5">Detection & Display</div>
        <div className="space-y-4">
          <Toggle checked={aiDetection} onChange={setAiDetection} label="AI Person Detection" />
          <Toggle checked={showBboxes} onChange={setShowBboxes} label="Show Bounding Boxes" />
          <Toggle checked={showGrid} onChange={setShowGrid} label="Show Density Grid Overlay" />
          <Toggle checked={heatmapOverlay} onChange={setHeatmapOverlay} label="Heatmap Overlay Available" />
          <div className="pt-2">
            <Slider value={targetFps} min={10} max={30} onChange={setTargetFps} label="🎥 Target FPS" />
          </div>
        </div>
      </GlowCard>

      {/* Alert Settings */}
      <GlowCard className="p-6">
        <div className="stat-label mb-5">Alerts & Sounds</div>
        <div className="space-y-4">
          <Toggle checked={soundEnabled} onChange={setSoundEnabled} label="Alert Sounds Enabled" />
          <Toggle checked={autoDispatch} onChange={setAutoDispatch} label="Auto-Dispatch Security on Critical" />

          {soundEnabled && (
            <div className="pt-3 border-t border-[var(--color-border)]">
              <div className="stat-label mb-3">Alert Sound Presets</div>
              <div className="grid grid-cols-2 gap-2">
                {ALARM_PRESETS.map((preset) => (
                  <button key={preset.id} onClick={() => preset.play()} className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-[var(--color-bg-hover)]"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-border)" }}
                  >
                    <span className="text-base">🔊</span>
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">{preset.name}</span>
                    <span className="text-[9px] text-[var(--color-accent)] ml-auto">Preview</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </GlowCard>

      {/* System Diagnostics */}
      <GlowCard className="p-6">
        <div className="stat-label mb-5">System Diagnostics</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "WebSocket", value: "Connected", color: "#00FF9C" },
            { label: "Latency", value: "12ms", color: "#00FF9C" },
            { label: "Model", value: "YOLOv8n", color: "#7B61FF" },
            { label: "GPU", value: "Active", color: "#00FF9C" },
          ].map((diag) => (
            <div key={diag.label} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-border)" }}>
              <div className="stat-label text-[9px] mb-1">{diag.label}</div>
              <div className="text-xs font-bold mono-data" style={{ color: diag.color }}>{diag.value}</div>
            </div>
          ))}
        </div>
      </GlowCard>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <button onClick={() => { localStorage.removeItem("crowdsense-session"); window.location.href = "/login"; }} className="btn-ghost text-xs text-[var(--color-critical)] cursor-pointer">
          🚪 Logout
        </button>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-[var(--color-safe)] animate-fade-in">✓ Settings saved</span>}
          <RippleButton variant="primary" onClick={handleSave} className="text-xs">
            💾 Save Settings
          </RippleButton>
        </div>
      </div>
    </div>
  );
}
