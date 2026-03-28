"use client";
import { useEffect, useCallback } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: "sm" | "md" | "lg" | "full";
}

export function Modal({ isOpen, onClose, children, title, size = "md" }: ModalProps) {
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;

  const sizeClass = size === "full" ? "w-full h-full" : size === "lg" ? "max-w-4xl w-full" : size === "sm" ? "max-w-sm w-full" : "max-w-2xl w-full";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div
        className={`relative ${sizeClass} rounded-2xl overflow-hidden animate-scale-in`}
        style={{
          background: "rgba(11, 27, 43, 0.95)",
          backdropFilter: "blur(40px)",
          border: "1px solid rgba(0, 255, 156, 0.15)",
          boxShadow: "0 0 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 255, 156, 0.05)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-wide uppercase">{title}</h2>
            <button onClick={onClose} className="btn-ghost text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] text-lg cursor-pointer">✕</button>
          </div>
        )}
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
