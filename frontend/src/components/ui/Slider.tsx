"use client";
import { useState } from "react";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  showValue?: boolean;
}

export function Slider({ value, min, max, step = 1, onChange, label, showValue = true }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const getColor = () => {
    if (pct > 75) return "#FF4D4D";
    if (pct > 50) return "#FFC857";
    return "#00FF9C";
  };

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>}
          {showValue && <span className="mono-data text-xs font-semibold" style={{ color: getColor() }}>{value}</span>}
        </div>
      )}
      <div className="relative w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-200"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #00FF9C, ${getColor()})`,
            boxShadow: `0 0 10px ${getColor()}50`,
          }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute w-full h-2 opacity-0 cursor-pointer"
        style={{ marginTop: "-8px" }}
      />
    </div>
  );
}
