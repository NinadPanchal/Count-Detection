"use client";
import { useState, useEffect, useRef } from "react";

export function DataStreamTerminal({ className = "" }: { className?: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<"all" | "detections" | "alerts" | "system">("all");

  useEffect(() => {
    const templates = [
      () => `[DET] Frame #${Math.floor(Math.random() * 9999).toString().padStart(4, "0")} — ${Math.floor(Math.random() * 30 + 5)} persons detected (conf: ${(Math.random() * 0.3 + 0.65).toFixed(2)})`,
      () => `[SYS] WebSocket heartbeat — latency: ${Math.floor(Math.random() * 15 + 3)}ms`,
      () => `[ALT] Zone ${Math.floor(Math.random() * 6 + 1)} density: ${(Math.random() * 3 + 0.5).toFixed(2)} p/m² — ${Math.random() > 0.6 ? "WARNING" : "NORMAL"}`,
      () => `[TRK] Track #${Math.floor(Math.random() * 50 + 1)} velocity: ${(Math.random() * 4 + 0.5).toFixed(1)} px/f direction: ${["N","NE","E","SE","S","SW","W","NW"][Math.floor(Math.random() * 8)]}`,
      () => `[GPU] Inference time: ${(Math.random() * 15 + 5).toFixed(1)}ms — YOLO v8n — FPS: ${Math.floor(Math.random() * 5 + 22)}`,
      () => `[HOT] Hotspot analysis: Grid(${Math.floor(Math.random() * 6)},${Math.floor(Math.random() * 8)}) — ${Math.floor(Math.random() * 8 + 2)} ppl clustered`,
      () => `[MOV] Convergence detected at Zone ${Math.floor(Math.random() * 3 + 1)} — ${Math.floor(Math.random() * 5 + 2)} inflow vectors`,
    ];

    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const template = templates[Math.floor(Math.random() * templates.length)];
      setLines((prev) => [...prev.slice(-50), `${now} ${template()}`]);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  const filtered = lines.filter((l) => {
    if (filter === "all") return true;
    if (filter === "detections") return l.includes("[DET]") || l.includes("[TRK]");
    if (filter === "alerts") return l.includes("[ALT]") || l.includes("[HOT]");
    if (filter === "system") return l.includes("[SYS]") || l.includes("[GPU]");
    return true;
  });

  const getColor = (line: string) => {
    if (line.includes("WARNING") || line.includes("[ALT]")) return "#FFC857";
    if (line.includes("[HOT]") || line.includes("Convergence")) return "#FF4D4D";
    if (line.includes("[SYS]") || line.includes("[GPU]")) return "#7B61FF";
    return "#00FF9C";
  };

  return (
    <div className={`panel overflow-hidden flex flex-col ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border)]">
        <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse-glow" />
        <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-widest">Data Stream</span>
        <div className="flex-1" />
        {(["all", "detections", "alerts", "system"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider cursor-pointer transition-all ${filter === f ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)] font-bold" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}`}>
            {f}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed" style={{ maxHeight: 240, background: "rgba(0,0,0,0.3)" }}>
        {filtered.map((line, i) => (
          <div key={i} className="animate-fade-in whitespace-nowrap" style={{ color: getColor(line) }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
