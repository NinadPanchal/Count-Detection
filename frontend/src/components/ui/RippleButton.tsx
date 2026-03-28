"use client";
import React, { useRef, useCallback, MouseEvent } from "react";

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: React.ReactNode;
}

export function RippleButton({ variant = "primary", children, className = "", onClick, ...props }: RippleButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    ripple.className = "ripple-effect";
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    onClick?.(e);
  }, [onClick]);

  const variantClass = variant === "primary" ? "btn-neon" : variant === "danger" ? "btn-danger" : variant === "ghost" ? "btn-ghost" : "btn-minimal";

  return (
    <button ref={btnRef} className={`ripple-container ${variantClass} ${className}`} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
