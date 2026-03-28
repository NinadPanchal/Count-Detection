"use client";

interface ZoneCapacityBarsProps {
  zones: { name: string; count: number; capacity: number }[];
  className?: string;
}

export function ZoneCapacityBars({ zones, className = "" }: ZoneCapacityBarsProps) {
  return (
    <div className={`flex items-end gap-3 justify-center h-[140px] ${className}`}>
      {zones.map((zone, i) => {
        const pct = Math.min((zone.count / zone.capacity) * 100, 100);
        const color = pct > 75 ? "#FF4D4D" : pct > 50 ? "#FFC857" : "#00FF9C";
        const isOver = pct > 75;
        return (
          <div key={zone.name} className="flex flex-col items-center gap-1.5 flex-1 max-w-[48px]" style={{ animationDelay: `${i * 100}ms` }}>
            <span className="mono-data text-[10px] font-bold" style={{ color }}>{zone.count}</span>
            <div className="relative w-full h-[100px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}20` }}>
              {/* Warning line */}
              <div className="absolute left-0 right-0 h-[1px] z-10" style={{ bottom: "75%", background: "rgba(255,77,77,0.3)" }} />
              {/* Fill bar */}
              <div
                className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-1000 ease-out"
                style={{
                  height: `${pct}%`,
                  background: `linear-gradient(to top, ${color}80, ${color})`,
                  boxShadow: `0 0 12px ${color}30, inset 0 2px 4px rgba(255,255,255,0.1)`,
                  animation: isOver ? "breathing-glow 2s ease-in-out infinite" : "none",
                }}
              />
            </div>
            <span className="text-[8px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider text-center leading-tight" style={{ maxWidth: 48 }}>
              {zone.name.split(" ")[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
