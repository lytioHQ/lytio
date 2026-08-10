"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useUiLang } from "@/lib/useUiLang";
import { t } from "@/lib/i18n";
import { Button, Card } from "@/components/ui";

const inputClasses =
  "h-12 w-full rounded-control border border-border bg-surface px-4 text-base text-ink placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40";

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
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-h1 text-ink">ExcelPilot</h1>
          <p className="mt-2 text-base text-secondary">{T("auth.register.title")}</p>
        </div>

        <Card className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-control border border-danger/20 bg-danger/5 px-4 py-2.5 text-sm text-danger">{error}</div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">{T("auth.register.name")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClasses}
                placeholder={T("auth.register.namePlaceholder")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">{T("auth.register.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClasses}
                placeholder={T("auth.register.emailPlaceholder")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">{T("auth.register.password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={inputClasses}
                placeholder={T("auth.register.passwordPlaceholder")}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? T("auth.register.creating") : T("auth.register.create")}
            </Button>
          </form>
        </Card>

        <p className="mt-5 text-center text-sm text-secondary">
          {T("auth.register.hasAccount")}{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            {T("auth.register.signIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}