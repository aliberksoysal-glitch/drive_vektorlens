"use client";

import { useEffect, useRef, useState } from "react";
import { parseApiResponse } from "@/lib/api/parseResponse";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

export type RenameItemKind = "klasör" | "işletme" | "dosya" | "fotoğraf";

type Props = {
  open: boolean;
  itemId: string;
  itemName: string;
  itemKind: RenameItemKind;
  onClose: () => void;
  onRenamed: (item: { id: string; name: string }) => void;
};

export function RenameItemDialog({
  open,
  itemId,
  itemName,
  itemKind,
  onClose,
  onRenamed,
}: Props) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(itemName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(itemName);
  }, [open, itemName]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  async function submit() {
    const name = value.trim();
    if (!name) {
      showToast({ message: "Ad boş olamaz.", variant: "error" });
      return;
    }
    if (name === itemName) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/drive/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: itemId, name }),
      });
      const { data, ok } = await parseApiResponse(res);
      if (!ok || !data.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Yeniden adlandırılamadı.",
        );
      }
      const item = data.item as { id: string; name: string };
      onRenamed(item);
      onClose();
      const label =
        itemKind === "işletme"
          ? "İşletme adı güncellendi."
          : itemKind === "klasör"
            ? "Klasör adı güncellendi."
            : "Ad güncellendi.";
      showToast({ message: label, variant: "success" });
    } catch (err) {
      showToast({
        message:
          err instanceof Error ? err.message : "Yeniden adlandırılamadı.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-item-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Kapat"
        onClick={() => !saving && onClose()}
      />
      <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h2
          id="rename-item-title"
          className="text-lg font-semibold text-slate-900"
        >
          Yeniden adlandır
        </h2>
        <p className="mt-1 text-xs text-slate-500 capitalize">{itemKind}</p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={saving}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15 disabled:bg-slate-100"
        />
        <div className="mt-4 flex gap-3">
          <Button
            variant="neutral"
            className="flex-1"
            disabled={saving}
            onClick={onClose}
          >
            İptal
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            disabled={saving || !value.trim()}
            onClick={() => void submit()}
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </div>
    </div>
  );
}
