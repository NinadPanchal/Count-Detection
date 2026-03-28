"use client";
import { useState, useEffect } from "react";

interface CounterProps {
  value: number;
  className?: string;
}

function FlipDigit({ digit, prevDigit }: { digit: string; prevDigit: string }) {
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (digit !== prevDigit) {
      setFlipping(true);
      const timer = setTimeout(() => setFlipping(false), 400);
      return () => clearTimeout(timer);
    }
  }, [digit, prevDigit]);

  return (
    <div className="relative w-[36px] h-[52px] mx-[1px]" style={{ perspective: "200px" }}>
      {/* Background */}
      <div className="absolute inset-0 rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(0,255,156,0.1)" }}>
        {/* Top half */}
        <div className="absolute inset-x-0 top-0 h-1/2 flex items-end justify-center overflow-hidden" style={{ borderBottom: "1px solid rgba(0,0,0,0.4)" }}>
          <span className="text-2xl font-bold text-[var(--color-text-primary)] translate-y-[55%] font-mono">{digit}</span>
        </div>
        {/* Bottom half */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 flex items-start justify-center overflow-hidden">
          <span className="text-2xl font-bold text-[var(--color-text-primary)] -translate-y-[45%] font-mono">{digit}</span>
        </div>
      </div>

      {/* Flipping card */}
      {flipping && (
        <>
          {/* Top flap going down (previous number) */}
          <div
            className="absolute inset-x-0 top-0 h-1/2 flex items-end justify-center overflow-hidden rounded-t-lg"
            style={{
              background: "rgba(0,0,0,0.6)",
              transformOrigin: "bottom",
              animation: "flip-down 0.3s ease-in forwards",
              backfaceVisibility: "hidden",
              zIndex: 2,
            }}
          >
            <span className="text-2xl font-bold text-[var(--color-text-primary)] translate-y-[55%] font-mono">{prevDigit}</span>
          </div>
          {/* Bottom flap coming up (new number) */}
          <div
            className="absolute inset-x-0 bottom-0 h-1/2 flex items-start justify-center overflow-hidden rounded-b-lg"
            style={{
              background: "rgba(0,0,0,0.6)",
              transformOrigin: "top",
              animation: "flip-up 0.3s ease-out 0.15s forwards",
              backfaceVisibility: "hidden",
              zIndex: 2,
            }}
          >
            <span className="text-2xl font-bold text-[var(--color-text-primary)] -translate-y-[45%] font-mono">{digit}</span>
          </div>
        </>
      )}

      {/* Center shine line */}
      <div className="absolute inset-x-0 top-1/2 h-[1px] -translate-y-[0.5px] z-10" style={{ background: "rgba(0,255,156,0.1)" }} />
    </div>
  );
}

export function CrowdCounter3D({ value, className = "" }: CounterProps) {
  const [prev, setPrev] = useState(value);
  const digits = String(value).padStart(3, "0").split("");
  const prevDigits = String(prev).padStart(3, "0").split("");

  useEffect(() => {
    const timer = setTimeout(() => setPrev(value), 50);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className={`flex items-center gap-0 ${className}`}>
      {digits.map((d, i) => (
        <FlipDigit key={i} digit={d} prevDigit={prevDigits[i] || "0"} />
      ))}
    </div>
  );
}
