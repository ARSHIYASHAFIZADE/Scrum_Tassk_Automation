"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cfToken, setCfToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(undefined);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!cfToken) {
      setError("Please wait for the security check to complete.");
      return;
    }

    setLoading(true);
    setError("");

    // Verify the Turnstile token server-side
    const verify = await fetch("/api/verify-turnstile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: cfToken }),
    });
    const { success } = await verify.json();

    if (!success) {
      setError("Security check failed. Please try again.");
      setLoading(false);
      turnstileRef.current?.reset();
      setCfToken(null);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      turnstileRef.current?.reset();
      setCfToken(null);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen t-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold t-text mb-1">Ashxcribe</h1>
          <p className="text-sm t-muted">Sign in to your account</p>
        </div>

        <div className="t-card border t-border rounded-2xl p-6 t-shadow space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium t-muted mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full t-input border t-border t-text text-sm
                           rounded-lg px-3 py-2.5 focus:outline-none focus:border-[var(--t-accent)]
                           placeholder:text-[var(--t-faint)] transition-colors"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium t-muted mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full t-input border t-border t-text text-sm
                           rounded-lg px-3 py-2.5 focus:outline-none focus:border-[var(--t-accent)]
                           placeholder:text-[var(--t-faint)] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {/* Cloudflare Turnstile widget */}
            <Turnstile
              ref={turnstileRef}
              siteKey={process.env.NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY!}
              onSuccess={(token) => setCfToken(token)}
              onExpire={() => setCfToken(null)}
              onError={() => {
                setCfToken(null);
                setError("Security check failed. Please refresh the page.");
              }}
              options={{ theme: "auto" }}
            />

            {error && (
              <div className="t-error-bg border border-[var(--t-error)]/30 rounded-lg px-3 py-2">
                <p className="text-xs t-error">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !cfToken}
              className="w-full t-accent hover:opacity-90 disabled:opacity-40
                         text-sm font-semibold py-2.5 rounded-lg transition-all"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-xs t-muted text-center mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="t-accent-text hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
