"use client";

interface HeaderProps {
  isConnected: boolean;
  fps: number;
  time: string;
  activeSource?: string;
}

const SplitText = ({ text, delayOffset = 0 }: { text: string; delayOffset?: number }) => (
  <span className="inline-flex">
    {text.split("").map((char, i) => (
      <span
        key={i}
        className="animate-slide-in-bottom opacity-0 inline-block"
        style={{ animationDelay: `${delayOffset + i * 40}ms`, animationFillMode: "forwards" }}
      >
        {char}
      </span>
    ))}
  </span>
);

export default function Header({ isConnected, fps, time, activeSource }: HeaderProps) {
  const sourceName =
    !activeSource || activeSource === "local"
      ? "Local"
      : `Device ${activeSource.slice(0, 6)}`;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--color-bg-surface)]/80 border-b border-[var(--color-border)]">
      <div className="flex items-center justify-between px-6 lg:px-8 py-4 max-w-[1600px] w-full mx-auto">
        {/* Bold wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 overflow-hidden py-1">
            <span className="text-lg font-extrabold tracking-tight text-[var(--color-text-primary)] drop-shadow-sm">
              <SplitText text="CROWD" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-[var(--color-accent)] drop-shadow-sm">
              <SplitText text="WATCH" delayOffset={200} />
            </span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-[var(--color-border-hover)]" />
          <span className="hidden sm:block text-xs font-medium text-[var(--color-text-tertiary)] tracking-wide animate-fade-in" style={{ animationDelay: "600ms" }}>
            Density Monitor
          </span>
        </div>

        {/* System info */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Source */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <span className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
              SRC
            </span>
            <span className="mono-data text-xs font-semibold text-[var(--color-accent)]">
              {sourceName}
            </span>
          </div>

          {/* FPS */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] transition-colors"
                style={{ borderColor: fps < 5 ? "var(--color-warning)" : "var(--color-border)"}}>
            <span className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
              FPS
            </span>
            <span className="mono-data text-xs font-semibold text-[var(--color-text-primary)]">
              {fps}
            </span>
          </div>

          {/* Time */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <span className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
              SYS
            </span>
            <span className="mono-data text-xs font-semibold text-[var(--color-text-primary)]">
              {time || "--:--:--"}
            </span>
          </div>

          {/* Live status pill */}
          {isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-safe-muted)] border border-[rgba(52,211,153,0.3)] shadow-[0_0_15px_rgba(52,211,153,0.2)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-safe)] animate-pulse-glow shadow-[0_0_8px_var(--color-safe)]" />
              <span className="text-[11px] font-semibold text-[var(--color-safe)] uppercase tracking-wide">
                Live
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-tertiary)]" />
              <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">
                Offline
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
