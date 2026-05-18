"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: (dismissPermanently: boolean) => void;
};

const STEPS = [
  {
    icon: "🏢",
    title: "İşletme ve Tarih",
    description:
      "Çalıştığın firmayı seçtiğinde sistem bugünü otomatik hedefler. İstersen takvimden geçmiş bir tarihi de seçebilirsin.",
  },
  {
    icon: "📂",
    title: "Konum Belirle",
    description:
      "Ortak havuzdaki mevcut klasörlerden birini seç (Örn: Elektrik Panosu) veya anında yeni bir tane oluştur.",
  },
  {
    icon: "📸",
    title: "Çek veya Seç",
    description:
      "Ekrandaki tek büyük mavi butona basarak ister kameranı aç, istersen de galeriden fotoğraf veya video seçerek saniyeler içinde Drive'a gönder.",
  },
] as const;

export function WelcomeModal({ open, onClose }: Props) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDontShowAgain(false);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-md"
        aria-label="Kapat"
        onClick={() => onClose(false)}
      />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-900/10"
      >
        <div
          className="bg-gradient-to-br from-blue-800 to-blue-900 px-6 py-5 text-white"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
            Vektör Lens
          </p>
          <h2
            id="welcome-modal-title"
            className="mt-1 text-xl font-bold leading-tight sm:text-2xl"
          >
            Vektör Lens&apos;e Hoş Geldiniz
          </h2>
          <p className="mt-2 text-sm text-blue-100">
            Saha fotoğraf ve videolarınızı üç adımda Drive&apos;a aktarın.
          </p>
        </div>

        <div
          className="max-h-[min(52vh,22rem)] overflow-y-auto px-5 py-5 sm:max-h-none sm:overflow-visible"
        >
          <ol className="space-y-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg ring-1 ring-blue-100"
                  aria-hidden
                >
                  {step.icon}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {index + 1}. {step.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div
          className="border-t border-slate-100 bg-slate-50/80 px-5 py-4"
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-800 focus:ring-blue-800/30"
            />
            <span className="text-sm text-slate-700">Bunu bir daha gösterme</span>
          </label>
          <button
            type="button"
            onClick={() => onClose(dontShowAgain)}
            className="btn-primary mt-4 w-full py-3.5 text-base font-semibold"
          >
            Anladım, Başlayalım
          </button>
        </div>
      </div>
    </div>
  );
}
