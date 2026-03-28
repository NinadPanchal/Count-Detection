"use client";
import React, { useRef, useState, MouseEvent } from "react";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  status?: "safe" | "warning" | "critical" | "purple" | "default";
}

const GLOW_COLORS = {
  safe: "rgba(0, 255, 156, 0.15)",
  warning: "rgba(255, 200, 87, 0.15)",
  critical: "rgba(255, 77, 77, 0.15)",
  purple: "rgba(123, 97, 255, 0.15)",
  default: "rgba(0, 255, 156, 0.08)",
};

const BORDER_COLORS = {
  safe: "rgba(0, 255, 156, 0.25)",
  warning: "rgba(255, 200, 87, 0.25)",
  critical: "rgba(255, 77, 77, 0.25)",
  purple: "rgba(123, 97, 255, 0.25)",
  default: "rgba(0, 255, 156, 0.08)",
};

export function GlowCard({ children, className = "", status = "default" }: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${className}`}
      style={{
        background: "rgba(15, 34, 51, 0.7)",
        backdropFilter: "blur(20px)",
        borderColor: hovering ? BORDER_COLORS[status] : "rgba(0, 255, 156, 0.08)",
        boxShadow: hovering ? `0 0 30px ${GLOW_COLORS[status]}` : "none",
        transform: hovering ? "scale(1.01) translateY(-2px)" : "scale(1)",
      }}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: hovering ? 1 : 0,
          background: `radial-gradient(400px circle at ${pos.x}px ${pos.y}px, ${GLOW_COLORS[status]}, transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
