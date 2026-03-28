"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface Command {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  category: string;
}

interface CommandPaletteProps {
  commands: Command[];
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ commands, isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter(
    (c) => c.label.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && filtered[selected]) { filtered[selected].action(); onClose(); }
    else if (e.key === "Escape") onClose();
  }, [filtered, selected, onClose]);

  if (!isOpen) return null;

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.category] ??= []).push(cmd);
    return acc;
  }, {});

  let idx = -1;

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden animate-scale-in"
        style={{
          background: "rgba(11, 27, 43, 0.97)",
          border: "1px solid rgba(0, 255, 156, 0.15)",
          boxShadow: "0 0 80px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 255, 156, 0.05)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKey}
            placeholder="Type a command..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-text-tertiary)] border border-[var(--color-border)]">ESC</kbd>
        </div>
        <div className="max-h-[300px] overflow-y-auto py-2">
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-4 py-1.5 text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-widest">{category}</div>
              {cmds.map((cmd) => {
                idx++;
                const i = idx;
                return (
                  <button
                    key={cmd.id}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${i === selected ? "bg-[rgba(0,255,156,0.08)] text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.03)]"}`}
                    onClick={() => { cmd.action(); onClose(); }}
                    onMouseEnter={() => setSelected(i)}
                  >
                    <span className="text-base">{cmd.icon}</span>
                    <span className="text-sm font-medium">{cmd.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-[var(--color-text-tertiary)]">No commands found</div>
          )}
        </div>
      </div>
    </div>
  );
}
