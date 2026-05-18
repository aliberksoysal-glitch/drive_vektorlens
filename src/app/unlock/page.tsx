"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { parseApiResponse } from "@/lib/api/parseResponse";

export default function UnlockPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const { data, ok } = await parseApiResponse(res);
      if (data.disabled) {
        setMessage("Bu ortamda API kilidi kapalı.");
        return;
      }
      if (!ok || !data.ok) {
        setMessage(
          typeof data.error === "string" ? data.error : "PIN kabul edilmedi.",
        );
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setMessage("İstek gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh px-4 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-xl font-semibold text-slate-900">Uygulama kilidi</h1>
        <p className="mt-2 text-sm text-slate-600">
          Yöneticinizden aldığınız PIN ile oturum açın. Oturum bir hafta geçerlidir.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            PIN
            <input
              type="password"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15"
            />
          </label>
          {message && (
            <p className="text-sm text-red-600" role="alert">
              {message}
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading || !pin.trim()}
          >
            {loading ? "Doğrulanıyor…" : "Kilidi aç"}
          </Button>
        </form>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-blue-800 underline"
        >
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
