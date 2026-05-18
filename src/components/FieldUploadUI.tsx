"use client";

import type { ChangeEvent, RefObject } from "react";

export type SubfolderOption = { id: string; name: string };

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

export function VisitDatePicker({
  value,
  onChange,
  disabled,
  targetPreview,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  targetPreview: string;
}) {
  return (
    <div className="surface-card space-y-3 p-4">
      <label
        htmlFor="visit-date"
        className="block text-xs font-semibold uppercase tracking-wide text-blue-800"
      >
        Ziyaret tarihi
      </label>
      <div className="relative">
        <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-800" />
        <input
          id="visit-date"
          type="date"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-base font-medium text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        />
      </div>
      <p className="break-words text-sm text-slate-600">
        <span className="font-medium text-slate-500">Hedef:</span>{" "}
        <span className="font-semibold text-slate-800">{targetPreview}</span>
      </p>
    </div>
  );
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; current: number; total: number; failed?: unknown[] }
  | { status: "success"; count: number }
  | { status: "error"; message: string; failed?: unknown[] };

export function UploadTargetBar({
  businessName,
  visitDateLabel,
  destinationLabel,
  preparing,
  ready,
  error,
  childFolders,
  loadingChildren,
  childrenError,
  selectedSubfolderId,
  onSelectSubfolder,
  newFolderName,
  onNewFolderNameChange,
  onCreateFolder,
  creatingFolder,
  disabled,
  onRefreshChildren,
}: {
  businessName: string;
  visitDateLabel: string;
  destinationLabel: string;
  preparing: boolean;
  ready: boolean;
  error: string | null;
  childFolders: SubfolderOption[];
  loadingChildren: boolean;
  childrenError: string | null;
  selectedSubfolderId: string | null;
  onSelectSubfolder: (folder: SubfolderOption | null) => void;
  newFolderName: string;
  onNewFolderNameChange: (value: string) => void;
  onCreateFolder: () => void;
  creatingFolder: boolean;
  disabled?: boolean;
  onRefreshChildren: () => void;
}) {
  const busy = disabled || preparing || creatingFolder;

  return (
    <div className="surface-card space-y-4 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
          Yükleme hedefi
        </p>
        <p className="mt-2 break-words text-base font-semibold leading-snug text-slate-900">
          <span className="font-medium text-slate-500">Yüklenecek Yer:</span>{" "}
          {businessName}
          <span className="mx-1.5 text-slate-300">&gt;</span>
          {visitDateLabel}
          <span className="mx-1.5 text-slate-300">&gt;</span>
          <span className="text-blue-900">{destinationLabel}</span>
        </p>
        {preparing && (
          <div
            className="mt-2 flex items-center gap-2 text-sm text-slate-600"
            role="status"
          >
            <InlineSpinner />
            Tarih klasörü hazırlanıyor…
          </div>
        )}
        {error && (
          <p className="mt-2 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
        {ready && !error && !preparing && (
          <p className="mt-1 text-xs font-medium text-emerald-700">
            Ortak klasör havuzu hazır
          </p>
        )}
      </div>

      {ready && !preparing && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-700">
              Ortak alanlar
              <span className="ml-1 font-normal text-slate-500">
                (tüm kullanıcılar)
              </span>
            </p>
            <button
              type="button"
              onClick={onRefreshChildren}
              disabled={busy || loadingChildren}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50"
            >
              {loadingChildren ? "…" : "Yenile"}
            </button>
          </div>

          {childrenError && (
            <p className="text-sm text-red-600" role="alert">
              {childrenError}
            </p>
          )}

          <div
            className="flex flex-wrap gap-2"
            role="listbox"
            aria-label="Alt klasör seçimi"
          >
            <button
              type="button"
              role="option"
              aria-selected={selectedSubfolderId === null}
              disabled={busy}
              onClick={() => onSelectSubfolder(null)}
              className={pillClass(selectedSubfolderId === null)}
            >
              Tarih klasörü
            </button>
            {loadingChildren && childFolders.length === 0 ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500">
                <InlineSpinner />
                Taranıyor…
              </span>
            ) : (
              childFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  role="option"
                  aria-selected={selectedSubfolderId === folder.id}
                  disabled={busy}
                  onClick={() => onSelectSubfolder(folder)}
                  className={pillClass(selectedSubfolderId === folder.id)}
                >
                  {folder.name}
                </button>
              ))
            )}
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onCreateFolder();
            }}
          >
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => onNewFolderNameChange(e.target.value)}
              disabled={busy}
              placeholder="Yeni alan adı (örn. Pano)"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15 disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={busy || !newFolderName.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-800 text-xl font-bold text-white shadow-sm transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Yeni klasör oluştur"
              title="Yeni klasör oluştur"
            >
              {creatingFolder ? <InlineSpinner light /> : "+"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function pillClass(active: boolean) {
  return [
    "rounded-full px-4 py-2 text-sm font-semibold transition-all",
    active
      ? "bg-blue-800 text-white shadow-md shadow-blue-900/20 ring-2 ring-blue-300 ring-offset-1"
      : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ].join(" ");
}

export function FieldUploadPanel({
  fileInputRef,
  uploadState,
  targetReady,
  uploadBusy,
  onFileChange,
  onPickPhotos,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  uploadState: UploadState;
  targetReady: boolean;
  uploadBusy: boolean;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onPickPhotos: () => void;
}) {
  const busy = uploadBusy || !targetReady;
  const isError = uploadState.status === "error";

  return (
    <section className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime,video/x-msvideo"
        multiple
        onChange={onFileChange}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />

      <button
        type="button"
        onClick={onPickPhotos}
        disabled={busy}
        className="flex min-h-[42vh] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-blue-600 bg-gradient-to-b from-blue-700 to-blue-900 px-6 py-8 text-center text-white shadow-xl shadow-blue-900/25 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="text-xl font-bold tracking-tight sm:text-2xl">
          📸 FOTOĞRAF VEYA VİDEO
        </span>
        <span className="max-w-sm text-sm font-medium text-blue-100">
          Kamerayı aç veya galeriden medya seç
        </span>
      </button>

      {isError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-600 ring-1 ring-red-200 whitespace-pre-line">
          {uploadState.message}
        </p>
      )}
    </section>
  );
}

function InlineSpinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-t-transparent ${
        light ? "border-white" : "border-blue-700"
      }`}
      role="status"
      aria-label="Yükleniyor"
    />
  );
}
