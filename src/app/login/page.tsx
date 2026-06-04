"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const errMsg = await signIn(email, password, rememberMe);

    if (errMsg) {
      setError(errMsg);
      setIsPending(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="canvas-bg min-h-screen flex items-center justify-center p-4">
      <div
        className="kpi-card w-full max-w-sm p-8 rounded-2xl"
      >
        {/* Brand mark */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--color-primary)" }}>
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-on-primary)" }}>restaurant</span>
          </div>
          <div>
            <h1
              className="text-xl font-extrabold leading-tight tracking-tight"
              style={{ color: "var(--color-primary)", fontFamily: "var(--font-manrope)" }}
            >
              Slipless
            </h1>
            <p className="text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              Restaurant Finance
            </p>
          </div>
        </div>

        <p
          className="text-sm mb-6"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          เข้าสู่ระบบเพื่อดำเนินการต่อ
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              อีเมล
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: "var(--color-surface-container-low)",
                color: "var(--color-on-surface)",
                border: "1.5px solid var(--color-outline-variant)",
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: "var(--color-surface-container-low)",
                color: "var(--color-on-surface)",
                border: "1.5px solid var(--color-outline-variant)",
              }}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
            />
            <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              จดจำอุปกรณ์นี้
            </span>
          </label>

          {error && (
            <p className="text-sm" style={{ color: "var(--color-error)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-on-primary)",
            }}
          >
            {isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
