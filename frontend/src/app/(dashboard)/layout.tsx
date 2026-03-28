"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { Modal } from "@/components/ui/Modal";
import { GlitchText } from "@/components/ui/GlitchText";
import { useTheme } from "@/hooks/useTheme";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { playEmergencySiren } from "@/lib/audioEngine";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [emergencyConfirm, setEmergencyConfirm] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Auth guard
  useEffect(() => {
    const session = localStorage.getItem("crowdsense-session");
    if (!session) router.push("/login");
  }, [router]);

  const commands = [
    { id: "dash", label: "Go to Dashboard", icon: "🏠", action: () => router.push("/dashboard"), category: "Navigation" },
    { id: "mon", label: "Go to Monitoring", icon: "🎥", action: () => router.push("/monitoring"), category: "Navigation" },
    { id: "heat", label: "Go to Heatmap", icon: "🔥", action: () => router.push("/heatmap"), category: "Navigation" },
    { id: "alert", label: "Go to Alerts", icon: "🚨", action: () => router.push("/alerts"), category: "Navigation" },
    { id: "anal", label: "Go to Analytics", icon: "📊", action: () => router.push("/analytics"), category: "Navigation" },
    { id: "pred", label: "Go to Predictions", icon: "🔮", action: () => router.push("/predictions"), category: "Navigation" },
    { id: "sett", label: "Go to Settings", icon: "⚙️", action: () => router.push("/settings"), category: "Navigation" },
    { id: "nv", label: "Toggle Night Vision", icon: "🌙", action: () => setTheme(theme === "nightvision" ? "default" : "nightvision"), category: "Actions" },
    { id: "em", label: "Emergency Protocol", icon: "🔴", action: () => setEmergencyConfirm(true), category: "Actions" },
    { id: "logout", label: "Logout", icon: "🚪", action: () => { localStorage.removeItem("crowdsense-session"); router.push("/login"); }, category: "Actions" },
  ];

  useKeyboardShortcuts({
    "mod+k": () => setCmdOpen(true),
    "1": () => router.push("/dashboard"),
    "2": () => router.push("/monitoring"),
    "3": () => router.push("/heatmap"),
    "4": () => router.push("/alerts"),
    "5": () => router.push("/analytics"),
    "6": () => router.push("/predictions"),
    "7": () => router.push("/settings"),
    "n": () => setTheme(theme === "nightvision" ? "default" : "nightvision"),
    "e": () => setEmergencyConfirm(true),
  });

  const handleEmergencyActivate = useCallback(() => {
    setEmergencyConfirm(false);
    setEmergencyMode(true);
    playEmergencySiren();
    setTimeout(() => setEmergencyMode(false), 10000);
  }, []);

  return (
    <div className={`flex min-h-screen bg-[var(--color-bg-base)] ${emergencyMode ? "emergency-active" : ""}`}>
      <Sidebar expanded={sidebarExpanded} onExpandChange={setSidebarExpanded} />

      <div
        className="flex-1 flex flex-col min-h-screen"
        style={{
          marginLeft: sidebarExpanded ? 220 : 64,
          transition: "margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <TopBar
          onCommandPalette={() => setCmdOpen(true)}
          onToggleNightVision={() => setTheme(theme === "nightvision" ? "default" : "nightvision")}
          onEmergency={() => setEmergencyConfirm(true)}
          nightVision={theme === "nightvision"}
        />

        {/* Emergency Banner */}
        {emergencyMode && (
          <div className="px-6 py-3 flex items-center justify-between animate-shake" style={{ background: "rgba(255,77,77,0.15)", borderBottom: "1px solid rgba(255,77,77,0.3)" }}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[var(--color-critical)] animate-pulse-glow" />
              <GlitchText text="⚠ EMERGENCY PROTOCOL ACTIVE ⚠" className="text-sm font-bold text-[var(--color-critical)] tracking-wider" />
            </div>
            <button onClick={() => setEmergencyMode(false)} className="btn-danger text-xs py-1 px-3 cursor-pointer">Deactivate</button>
          </div>
        )}

        <main className="flex-1 p-6 overflow-y-auto bg-grid-pattern">
          <div className="relative z-10 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette commands={commands} isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Emergency Confirmation Modal */}
      <Modal isOpen={emergencyConfirm} onClose={() => setEmergencyConfirm(false)} title="Emergency Protocol">
        <div className="text-center py-6">
          <div className="text-5xl mb-4">🚨</div>
          <h3 className="text-lg font-bold text-[var(--color-critical)] mb-2">Activate Emergency Protocol?</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">This will trigger system-wide alerts and activate lockdown UI mode.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setEmergencyConfirm(false)} className="btn-minimal cursor-pointer">Cancel</button>
            <button onClick={handleEmergencyActivate} className="btn-danger cursor-pointer">Activate Emergency</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
