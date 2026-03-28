"use client";
import { useState, useEffect, useRef } from "react";

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
  cursor?: boolean;
}

export function Typewriter({ text, speed = 40, delay = 0, className = "", onComplete, cursor = true }: TypewriterProps) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    idx.current = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      idx.current++;
      if (idx.current > text.length) {
        clearInterval(interval);
        onComplete?.();
        return;
      }
      setDisplayed(text.slice(0, idx.current));
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, started, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {cursor && started && idx.current <= text.length && (
        <span className="inline-block w-[2px] h-[1em] ml-0.5 bg-[var(--color-accent)]" style={{ animation: "typing-cursor 0.8s step-end infinite", verticalAlign: "text-bottom" }} />
      )}
    </span>
  );
}
