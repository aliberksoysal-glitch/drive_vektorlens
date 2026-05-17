"use client";

import { useState } from "react";
import { parseApiResponse } from "@/lib/api/parseResponse";

type DeleteItemButtonProps = {
  itemId: string;
  itemName: string;
  itemKind?: "dosya" | "klasör" | "işletme" | "fotoğraf";
  onDeleted: () => void;
  className?: string;
  iconOnly?: boolean;
};

export function DeleteItemButton({
  itemId,
  itemName,
  itemKind = "dosya",
  onDeleted,
  className = "",
  iconOnly = true,
}: DeleteItemButtonProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const label =
      itemKind === "klasör" || itemKind === "işletme"
        ? `"${itemName}" klasörünü ve içindekileri silmek istediğinize emin misiniz?`
        : `"${itemName}" öğesini silmek istediğinize emin misiniz?`;

    if (!window.confirm(label)) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/drive/items?fileId=${encodeURIComponent(itemId)}`,
        { method: "DELETE" },
      );
      const { data, ok } = await parseApiResponse(res);
      if (!ok || !data.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Silinemedi.",
        );
      }
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silinemedi.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label={`${itemName} sil`}
      title="Sil"
      className={`inline-flex items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 ${iconOnly ? "h-9 w-9 shrink-0" : "gap-1.5 px-3 py-2 text-sm font-semibold"} ${className}`}
    >
      {deleting ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      ) : (
        <TrashIcon className={iconOnly ? "h-4 w-4" : "h-4 w-4"} />
      )}
      {!iconOnly && <span>Sil</span>}
    </button>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
