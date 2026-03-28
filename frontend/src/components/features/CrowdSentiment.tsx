"use client";
import { useState, useEffect, useRef } from "react";

interface CrowdSentimentProps {
  speed: number;
  density: number;
  convergence: number;
}

const MOODS = [
  { emoji: "😊", label: "Calm", color: "#00FF9C", threshold: 20 },
  { emoji: "😐", label: "Neutral", color: "#7B61FF", threshold: 35 },
  { emoji: "😟", label: "Anxious", color: "#FFC857", threshold: 55 },
  { emoji: "😰", label: "Tense", color: "#FF8C42", threshold: 75 },
  { emoji: "😱", label: "Panic", color: "#FF4D4D", threshold: 100 },
];

export function CrowdSentiment({ speed, density, convergence }: CrowdSentimentProps) {
  const score = Math.min(100, Math.round(density * 0.4 + speed * 0.3 + convergence * 0.3));
  const mood = MOODS.reduce((prev, m) => (score <= m.threshold ? prev || m : m), MOODS[0]);
  const [displayed, setDisplayed] = useState(score);

  useEffect(() => {
    let frame: number;
    const animate = () => {
      setDisplayed((prev) => {
        const diff = score - prev;
        if (Math.abs(diff) < 1) return score;
        frame = requestAnimationFrame(animate);
        return prev + diff * 0.1;
      });
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference * (1 - displayed / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 100, height: 100 }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="42"
            fill="none" stroke={mood.color} strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease" }}
            filter={`drop-shadow(0 0 6px ${mood.color}50)`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl" style={{ filter: `drop-shadow(0 0 8px ${mood.color})` }}>{mood.emoji}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: mood.color }}>{mood.label}</div>
        <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">Crowd Mood Score: {Math.round(displayed)}</div>
      </div>
    </div>
  );
}
