"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem("crowdsense-session");
    router.replace(session ? "/dashboard" : "/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
      <div className="text-center animate-pulse-glow">
        <div className="text-2xl font-bold mb-2">
          <span className="text-[var(--color-text-primary)]">CROWD</span>
          <span className="text-[var(--color-accent)]">SENSE</span>
          <span className="text-[var(--color-purple)] ml-1">AI</span>
        </div>
        <p className="text-xs text-[var(--color-text-tertiary)]">Loading...</p>
      </div>
    </div>
  );
}
