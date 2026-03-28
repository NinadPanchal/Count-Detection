"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={`flex items-center gap-3 cursor-pointer select-none ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer"
        style={{
          background: checked ? "rgba(0, 255, 156, 0.2)" : "rgba(255, 255, 255, 0.06)",
          border: `1px solid ${checked ? "rgba(0, 255, 156, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
          boxShadow: checked ? "0 0 12px rgba(0, 255, 156, 0.2)" : "none",
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-300"
          style={{
            background: checked ? "#00FF9C" : "#3D5A73",
            transform: checked ? "translateX(20px)" : "translateX(0)",
            boxShadow: checked ? "0 0 8px #00FF9C" : "none",
          }}
        />
      </button>
      {label && <span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>}
    </label>
  );
}
