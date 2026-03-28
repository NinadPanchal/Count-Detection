"use client";

interface HologramCardProps {
  children: React.ReactNode;
  className?: string;
}

export function HologramCard({ children, className = "" }: HologramCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl animate-hologram ${className}`}
      style={{
        background: "rgba(0, 212, 255, 0.04)",
        border: "1px solid rgba(0, 212, 255, 0.2)",
        boxShadow: "0 0 20px rgba(0, 212, 255, 0.08), inset 0 0 20px rgba(0, 212, 255, 0.03)",
      }}
    >
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 212, 255, 0.02) 2px, rgba(0, 212, 255, 0.02) 4px)",
      }} />
      {/* Cyan top glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.5), transparent)" }} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
