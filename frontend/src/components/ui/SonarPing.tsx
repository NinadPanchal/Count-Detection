"use client";

interface SonarPingProps {
  size?: number;
  color?: string;
  className?: string;
}

export function SonarPing({ size = 24, color = "#00FF9C", className = "" }: SonarPingProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <div className="absolute rounded-full animate-sonar" style={{ width: size, height: size, border: `2px solid ${color}`, opacity: 0.6 }} />
      <div className="absolute rounded-full animate-sonar" style={{ width: size, height: size, border: `2px solid ${color}`, opacity: 0.4, animationDelay: "0.6s" }} />
      <div className="rounded-full" style={{ width: size * 0.3, height: size * 0.3, background: color, boxShadow: `0 0 8px ${color}` }} />
    </div>
  );
}
