"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/monitoring", label: "Monitoring", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
  { href: "/heatmap", label: "Heatmap", icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" },
  { href: "/alerts", label: "Alerts", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", badge: 3 },
  { href: "/analytics", label: "Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/predictions", label: "Predictions", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { href: "/settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
];

interface SidebarProps {
  expanded: boolean;
  onExpandChange: (v: boolean) => void;
}

export default function Sidebar({ expanded, onExpandChange }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex flex-col h-screen border-r border-[var(--color-border)]"
      style={{
        width: expanded ? 220 : 64,
        background: "var(--color-bg-sidebar)",
        transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onMouseEnter={() => onExpandChange(true)}
      onMouseLeave={() => onExpandChange(false)}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] overflow-hidden"
        style={{ padding: expanded ? "16px 16px" : "16px 14px", transition: "padding 0.3s ease" }}>
        <div className="w-8 h-8 min-w-[32px] rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(0,255,156,0.1)", border: "1px solid rgba(0,255,156,0.2)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF9C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </div>
        <div className="whitespace-nowrap overflow-hidden" style={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0, transition: "opacity 0.2s ease 0.1s, width 0.3s ease" }}>
          <div className="text-sm font-bold tracking-tight">
            <span className="text-[var(--color-text-primary)]">CROWD</span>
            <span className="text-[var(--color-accent)]">SENSE</span>
          </div>
          <div className="text-[9px] text-[var(--color-accent)] font-medium tracking-[0.15em] uppercase opacity-60">AI Command</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {expanded && (
          <div className="px-4 mb-2">
            <span className="text-[9px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-[0.15em] whitespace-nowrap">Navigation</span>
          </div>
        )}
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={expanded ? undefined : item.label}
              className={`flex items-center gap-3 relative text-sm font-medium cursor-pointer transition-all duration-200 text-decoration-none ${isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[rgba(0,255,156,0.04)]"}`}
              style={{
                padding: expanded ? "9px 14px" : "9px 0",
                justifyContent: expanded ? "flex-start" : "center",
                margin: expanded ? "2px 8px" : "2px 6px",
                borderRadius: 10,
                background: isActive ? "rgba(0,255,156,0.08)" : undefined,
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute top-1/2 -translate-y-1/2" style={{ left: expanded ? -8 : -6, width: 3, height: 20, background: "var(--color-accent)", borderRadius: "0 4px 4px 0", boxShadow: "0 0 10px var(--color-accent)" }} />
              )}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d={item.icon} />
              </svg>
              <span className="whitespace-nowrap overflow-hidden" style={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0, transition: "opacity 0.2s ease 0.1s, width 0.3s ease", fontSize: 13 }}>
                {item.label}
              </span>
              {item.badge && expanded && (
                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-critical-muted)] text-[var(--color-critical)] font-bold">{item.badge}</span>
              )}
              {item.badge && !expanded && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-critical)]" style={{ boxShadow: "0 0 6px var(--color-critical)" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — user */}
      <div className="border-t border-[var(--color-border)] overflow-hidden"
        style={{ padding: expanded ? "12px 16px" : "12px 0", transition: "padding 0.3s ease" }}>
        <div className="flex items-center gap-3" style={{ justifyContent: expanded ? "flex-start" : "center" }}>
          <div className="w-8 h-8 min-w-[32px] rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center text-xs font-bold text-[var(--color-accent)] flex-shrink-0">
            OP
          </div>
          <div className="whitespace-nowrap overflow-hidden" style={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0, transition: "opacity 0.2s ease 0.1s, width 0.3s ease" }}>
            <div className="text-xs font-semibold text-[var(--color-text-primary)]">Operator</div>
            <div className="text-[10px] text-[var(--color-text-tertiary)]">Admin Access</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
