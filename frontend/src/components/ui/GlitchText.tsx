"use client";

interface GlitchTextProps {
  text: string;
  className?: string;
  active?: boolean;
}

export function GlitchText({ text, className = "", active = true }: GlitchTextProps) {
  if (!active) return <span className={className}>{text}</span>;
  return (
    <span className={`glitch-text ${className}`} data-text={text}>
      {text}
    </span>
  );
}
