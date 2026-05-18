"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
};

type Pending = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirmDialog() {
  const ctx = useContext(ConfirmContext);
  if (!ctx)
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  return ctx;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options: opts, resolve });
    });
  }, []);

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  useEffect(() => {
    if (!pending) return;
    const current = pending;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        current.resolve(false);
        setPending(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-desc"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => close(false)}
            aria-label="İptal"
          />
          <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2
              id="confirm-title"
              className="text-lg font-semibold text-slate-900"
            >
              {pending.options.title}
            </h2>
            <p id="confirm-desc" className="mt-2 text-sm text-slate-600">
              {pending.options.message}
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                variant="neutral"
                className="flex-1"
                onClick={() => close(false)}
              >
                {pending.options.cancelLabel ?? "İptal"}
              </Button>
              <Button
                type="button"
                variant={
                  pending.options.variant === "danger" ? "danger" : "primary"
                }
                className="flex-1"
                onClick={() => close(true)}
              >
                {pending.options.confirmLabel ?? "Tamam"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
