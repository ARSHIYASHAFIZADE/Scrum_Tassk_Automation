"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="min-h-screen t-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold t-text mb-1">Ashxcribe</h1>
          <p className="text-sm t-muted">Create your free account</p>
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
                autoComplete="new-password"
                className="w-full t-input border t-border t-text text-sm
                           rounded-lg px-3 py-2.5 focus:outline-none focus:border-[var(--t-accent)]
                           placeholder:text-[var(--t-faint)] transition-colors"
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-medium t-muted mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full t-input border t-border t-text text-sm
                           rounded-lg px-3 py-2.5 focus:outline-none focus:border-[var(--t-accent)]
                           placeholder:text-[var(--t-faint)] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="t-error-bg border border-[var(--t-error)]/30 rounded-lg px-3 py-2">
                <p className="text-xs t-error">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full t-accent hover:opacity-90 disabled:opacity-40
                         text-sm font-semibold py-2.5 rounded-lg transition-all"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-xs t-muted text-center mt-5">
          Already have an account?{" "}
          <Link href="/login" className="t-accent-text hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
