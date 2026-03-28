"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MatrixRain } from "@/components/ui/MatrixRain";
import { Typewriter } from "@/components/ui/Typewriter";
import { RippleButton } from "@/components/ui/RippleButton";
import { ParticleNetwork } from "@/components/ui/ParticleNetwork";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "operator">("operator");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("crowdsense-session", JSON.stringify({ email, role, ts: Date.now() }));
      router.push("/dashboard");
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "#050d15" }}>
      {/* Background layers */}
      <MatrixRain className="opacity-30" />
      <ParticleNetwork className="opacity-20" />

      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,255,156,0.06) 0%, transparent 70%)" }} />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-scale-in">
        <div className="rounded-2xl overflow-hidden" style={{
          background: "rgba(11, 27, 43, 0.85)",
          backdropFilter: "blur(40px)",
          border: "1px solid rgba(0, 255, 156, 0.12)",
          boxShadow: "0 0 80px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 255, 156, 0.05)",
        }}>
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,255,156,0.1)", border: "1px solid rgba(0,255,156,0.2)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FF9C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </div>
              <span className="text-xl font-bold">
                <span className="text-[var(--color-text-primary)]">CROWD</span>
                <span className="text-[var(--color-accent)]">SENSE</span>
                <span className="text-[var(--color-purple)] ml-1 text-sm">AI</span>
              </span>
            </div>
            <div className="text-sm text-[var(--color-text-secondary)] h-6">
              <Typewriter text="See the Crowd. Prevent the Chaos." speed={50} cursor />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-8 pb-10 space-y-5">
            {/* Role Selector */}
            <div className="flex gap-2">
              {(["admin", "operator"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all ${role === r ? "text-[var(--color-bg-base)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}`}
                  style={{
                    background: role === r ? "var(--color-accent)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${role === r ? "var(--color-accent)" : "rgba(255,255,255,0.06)"}`,
                    boxShadow: role === r ? "0 0 20px rgba(0,255,156,0.3)" : "none",
                  }}
                >
                  {r === "admin" ? "🔐 Admin" : "👁 Operator"}
                </button>
              ))}
            </div>

            {/* Email */}
            <div className="relative">
              <label className="block text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused("")}
                placeholder="operator@crowdsense.ai"
                required
                className="w-full px-4 py-3 rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${focused === "email" ? "rgba(0,255,156,0.4)" : "rgba(255,255,255,0.06)"}`,
                  boxShadow: focused === "email" ? "0 0 20px rgba(0,255,156,0.1)" : "none",
                }}
              />
              {focused === "email" && <div className="absolute left-0 right-0 bottom-0 h-[1px] scan-line" />}
            </div>

            {/* Password */}
            <div className="relative">
              <label className="block text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused("")}
                placeholder="••••••••••"
                required
                className="w-full px-4 py-3 rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${focused === "password" ? "rgba(0,255,156,0.4)" : "rgba(255,255,255,0.06)"}`,
                  boxShadow: focused === "password" ? "0 0 20px rgba(0,255,156,0.1)" : "none",
                }}
              />
            </div>

            {/* Biometric toggle */}
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-[var(--color-text-secondary)]">🔒 Biometric Authentication</span>
              <div className="w-9 h-5 rounded-full cursor-pointer" style={{ background: "rgba(0,255,156,0.15)", border: "1px solid rgba(0,255,156,0.3)" }}>
                <div className="w-4 h-4 rounded-full mt-[1px] ml-[1px] transition-transform" style={{ background: "var(--color-accent)", transform: "translateX(0)" }} />
              </div>
            </div>

            {/* Login button */}
            <RippleButton type="submit" variant="primary" className="w-full py-3 text-sm" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[var(--color-bg-base)] border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                "Access Command Center"
              )}
            </RippleButton>
          </form>
        </div>

        {/* Bottom text */}
        <p className="text-center text-[10px] text-[var(--color-text-tertiary)] mt-6 tracking-wider">
          CROWDSENSE AI v2.0 — SECURE ACCESS
        </p>
      </div>
    </div>
  );
}
