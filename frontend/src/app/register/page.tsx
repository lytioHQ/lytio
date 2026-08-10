"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useUiLang } from "@/lib/useUiLang";
import { t } from "@/lib/i18n";

export default function RegisterPage() {
  const { register: doRegister } = useAuth();
  const router = useRouter();
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError(T("auth.register.passwordMin")); return; }
    setLoading(true);
    try {
      await doRegister(name, email, password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : T("auth.register.fallbackError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">ExcelPilot</h1>
          <p className="mt-1 text-sm text-slate-500">{T("auth.register.title")}</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{T("auth.register.name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder={T("auth.register.namePlaceholder")}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{T("auth.register.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder={T("auth.register.emailPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{T("auth.register.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder={T("auth.register.passwordPlaceholder")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? T("auth.register.creating") : T("auth.register.create")}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          {T("auth.register.hasAccount")}{" "}
          <Link href="/login" className="font-medium text-slate-700 hover:text-slate-900">
            {T("auth.register.signIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}