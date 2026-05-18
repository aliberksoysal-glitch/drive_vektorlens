"use client";

import { useCallback, useEffect, useState } from "react";
import { parseApiResponse } from "@/lib/api/parseResponse";
import { RenameItemDialog } from "@/components/ui/RenameItemDialog";

export type PickerFolder = { id: string; name: string };

type Props = {
  business: PickerFolder;
  currentTargetId: string | null;
  busy?: boolean;
  onPickTarget: (target: PickerFolder) => void;
  onFolderRenamed?: (item: PickerFolder) => void;
};

export function UploadFolderPicker({
  business,
  currentTargetId,
  busy,
  onPickTarget,
  onFolderRenamed,
}: Props) {
  const [stack, setStack] = useState<PickerFolder[]>([
    { id: business.id, name: business.name },
  ]);
  const [subfolders, setSubfolders] = useState<PickerFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [renameTarget, setRenameTarget] = useState<PickerFolder | null>(null);

  const current = stack[stack.length - 1]!;

  function applyRename(item: PickerFolder) {
    setStack((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, name: item.name } : f)),
    );
    setSubfolders((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, name: item.name } : f)),
    );
    onFolderRenamed?.(item);
  }

  useEffect(() => {
    setStack([{ id: business.id, name: business.name }]);
    setNextPageToken(undefined);
  }, [business.id, business.name]);

  const loadChildren = useCallback(
    async (folderId: string, opts: { append: boolean; pageToken?: string }) => {
      const append = opts.append;
      const pageToken = opts.pageToken;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        let url = `/api/drive/browse?folderId=${encodeURIComponent(folderId)}`;
        if (pageToken) {
          url += `&pageToken=${encodeURIComponent(pageToken)}`;
        }
        const res = await fetch(url);
        const { data, ok } = await parseApiResponse(res);
        if (!ok || !data.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Alt klasörler yüklenemedi.",
          );
        }
        const list = (data.folders as PickerFolder[]) ?? [];
        setSubfolders((prev) =>
          append ? [...prev, ...list] : list,
        );
        setNextPageToken(
          typeof data.nextPageToken === "string"
            ? data.nextPageToken
            : undefined,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Hata");
        if (!append) setSubfolders([]);
        setNextPageToken(undefined);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadChildren(current.id, { append: false });
  }, [current.id, loadChildren]);

  function enterFolder(folder: PickerFolder) {
    setStack((prev) => [...prev, folder]);
    setNextPageToken(undefined);
  }

  function goUp() {
    setStack((prev) => (prev.length <= 1 ? prev : prev.slice(0, -1)));
    setNextPageToken(undefined);
  }

  function goToCrumb(index: number) {
    setStack((prev) => prev.slice(0, index + 1));
    setNextPageToken(undefined);
  }

  const isTargetHere = currentTargetId === current.id;

  return (
    <div className="surface-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Klasör seç
      </p>
      <p className="mt-0.5 text-sm text-slate-600">
        İşletme içinde klasörlere girip yükleme hedefini seçin
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1 text-xs text-slate-600">
        {stack.map((crumb, index) => (
          <span key={crumb.id} className="flex items-center gap-1">
            {index > 0 && <span className="text-slate-300">/</span>}
            <button
              type="button"
              disabled={busy}
              onClick={() => goToCrumb(index)}
              className={`max-w-[7rem] truncate rounded px-1 py-0.5 font-medium transition-colors hover:bg-slate-100 disabled:opacity-50 ${
                index === stack.length - 1
                  ? "text-blue-900"
                  : "text-blue-700 underline-offset-2 hover:underline"
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {error && (
        <p className="mt-2 text-center text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/50">
        {loading ? (
          <p className="px-3 py-6 text-center text-sm text-slate-500">Yükleniyor…</p>
        ) : subfolders.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-slate-500">
            Bu klasörde alt klasör yok
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {subfolders.map((f) => (
              <li key={f.id} className="flex items-center">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => enterFolder(f)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-white disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="shrink-0 text-xs text-blue-700">İçine →</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRenameTarget(f)}
                  className="mr-2 shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-800 disabled:opacity-50"
                  aria-label={`${f.name} yeniden adlandır`}
                  title="Yeniden adlandır"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {nextPageToken && !loading && (
        <button
          type="button"
          disabled={busy || loadingMore}
          onClick={() =>
            void loadChildren(current.id, {
              append: true,
              pageToken: nextPageToken,
            })
          }
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-blue-900 hover:bg-slate-50 disabled:opacity-50"
        >
          {loadingMore ? "Yükleniyor…" : "Daha fazla klasör"}
        </button>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {stack.length > 1 && (
          <button
            type="button"
            disabled={busy}
            onClick={goUp}
            className="btn-secondary shrink-0 py-2.5 text-sm sm:flex-1"
          >
            Üst klasör
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onPickTarget(current)}
          className={`btn-primary py-2.5 text-sm sm:flex-1 ${
            isTargetHere ? "ring-2 ring-emerald-400 ring-offset-2" : ""
          }`}
        >
          {isTargetHere ? "✓ Bu klasör seçili" : "Bu klasöre yükle"}
        </button>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => setRenameTarget(current)}
        className="mt-2 w-full rounded-lg border border-dashed border-slate-200 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        Açık klasörü yeniden adlandır
      </button>

      <RenameItemDialog
        open={!!renameTarget}
        itemId={renameTarget?.id ?? ""}
        itemName={renameTarget?.name ?? ""}
        itemKind="klasör"
        onClose={() => setRenameTarget(null)}
        onRenamed={(item) => applyRename(item)}
      />
    </div>
  );
}

function PencilIcon({ className }: { className?: string }) {
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
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}
