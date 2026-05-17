"use client";

import { useCallback, useEffect, useState } from "react";
import { DeleteItemButton } from "@/components/DeleteItemButton";
import { NavigationBar } from "@/components/NavigationBar";
import { parseApiResponse } from "@/lib/api/parseResponse";

type BrowseFolder = { id: string; name: string };

type BrowseFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
};

type BrowseData = {
  folder: BrowseFolder;
  parentId: string | null;
  folders: BrowseFolder[];
  files: BrowseFile[];
};

type Breadcrumb = BrowseFolder;

function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

export function DriveBrowser({
  rootFolderId,
  rootFolderName,
}: {
  rootFolderId: string;
  rootFolderName: string;
}) {
  const [folderNav, setFolderNav] = useState({
    stack: [{ id: rootFolderId, name: rootFolderName }] as Breadcrumb[],
    index: 0,
  });
  const [data, setData] = useState<BrowseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<BrowseFile | null>(null);

  const { stack: navStack, index: navIndex } = folderNav;
  const breadcrumbs = navStack.slice(0, navIndex + 1);
  const currentFolderId = navStack[navIndex]?.id ?? rootFolderId;
  const canGoBack = navIndex > 0;
  const canGoForward = navIndex < navStack.length - 1;

  const loadFolder = useCallback(async (folderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/drive/browse?folderId=${encodeURIComponent(folderId)}`,
      );
      const { data: payload, ok } = await parseApiResponse(res);
      if (!ok || !payload.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Klasör içeriği yüklenemedi.",
        );
      }
      setData({
        folder: payload.folder as BrowseFolder,
        parentId: (payload.parentId as string | null) ?? null,
        folders: (payload.folders as BrowseFolder[]) ?? [],
        files: (payload.files as BrowseFile[]) ?? [],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Klasör içeriği yüklenemedi.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolder(currentFolderId);
  }, [currentFolderId, loadFolder]);

  function openFolder(folder: BrowseFolder) {
    setFolderNav((prev) => {
      const truncated = prev.stack.slice(0, prev.index + 1);
      const existing = truncated.findIndex((b) => b.id === folder.id);
      if (existing >= 0) {
        return { stack: truncated, index: existing };
      }
      const next = [...truncated, folder];
      return { stack: next, index: next.length - 1 };
    });
    setPreviewFile(null);
  }

  function goToBreadcrumb(index: number) {
    setFolderNav((prev) => ({ ...prev, index }));
    setPreviewFile(null);
  }

  function goBack() {
    if (!canGoBack) return;
    setFolderNav((prev) => ({ ...prev, index: prev.index - 1 }));
    setPreviewFile(null);
  }

  function goForward() {
    if (!canGoForward) return;
    setFolderNav((prev) => ({ ...prev, index: prev.index + 1 }));
    setPreviewFile(null);
  }

  function handleCancel() {
    if (previewFile) {
      setPreviewFile(null);
      return;
    }
    setFolderNav({
      stack: [{ id: rootFolderId, name: rootFolderName }],
      index: 0,
    });
    setPreviewFile(null);
  }

  function handleItemDeleted(deletedId: string) {
    if (previewFile?.id === deletedId) setPreviewFile(null);

    const inNav = folderNav.stack.some((b) => b.id === deletedId);
    if (inNav) {
      setFolderNav((prev) => {
        const idx = prev.stack.findIndex((b) => b.id === deletedId);
        if (idx < 0) return prev;
        const newStack = prev.stack.slice(0, idx);
        const fallback =
          newStack.length > 0
            ? newStack
            : [{ id: rootFolderId, name: rootFolderName }];
        return { stack: fallback, index: fallback.length - 1 };
      });
    } else {
      loadFolder(currentFolderId);
    }
  }

  const imageFiles = data?.files.filter((f) => isImageMime(f.mimeType)) ?? [];
  const otherFiles = data?.files.filter((f) => !isImageMime(f.mimeType)) ?? [];

  return (
    <section className="surface-card p-5">
      <div className="mb-4 border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-blue-900">Drive gezgini</h2>
        <p className="mt-0.5 text-sm text-slate-600">
          Klasörler ve fotoğraflar Drive ile aynı yapıda
        </p>
      </div>

      <NavigationBar
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={goBack}
        onForward={goForward}
        onCancel={handleCancel}
        cancelDisabled={!canGoBack && !previewFile}
        cancelLabel={previewFile ? "Kapat" : "İptal"}
      />

      <div className="mb-3 flex flex-wrap items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.id} className="flex items-center gap-1">
            {index > 0 && <span className="text-slate-300">/</span>}
            <button
              type="button"
              onClick={() => goToBreadcrumb(index)}
              className={`max-w-[8rem] truncate rounded px-1 py-0.5 font-medium transition-colors hover:bg-blue-50 ${
                index === breadcrumbs.length - 1
                  ? "text-blue-900"
                  : "text-blue-600"
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => loadFolder(currentFolderId)}
            className="mt-2 text-sm font-semibold text-red-800 underline"
          >
            Tekrar dene
          </button>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {data.folders.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Klasörler ({data.folders.length})
              </p>
              <ul className="max-h-52 divide-y divide-slate-100 overflow-y-auto overscroll-y-contain rounded-xl border border-slate-100">
                {data.folders.map((folder) => (
                  <li key={folder.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => openFolder(folder)}
                      className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
                    >
                      <FolderIcon className="h-5 w-5 shrink-0 text-amber-500" />
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                        {folder.name}
                      </span>
                      <ChevronIcon className="h-4 w-4 shrink-0 text-slate-300" />
                    </button>
                    <DeleteItemButton
                      itemId={folder.id}
                      itemName={folder.name}
                      itemKind="klasör"
                      onDeleted={() => handleItemDeleted(folder.id)}
                      className="mr-2"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {imageFiles.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Fotoğraflar ({imageFiles.length})
              </p>
              <div className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-y-contain rounded-xl border border-slate-100 bg-slate-50/40 p-2 [-webkit-overflow-scrolling:touch]">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {imageFiles.map((file) => (
                  <div
                    key={file.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="h-full w-full"
                    >
                    {file.thumbnailLink ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.thumbnailLink}
                        alt={file.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        Önizleme yok
                      </div>
                    )}
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 py-0.5 text-[10px] text-white">
                      {file.name}
                    </span>
                    </button>
                    <DeleteItemButton
                      itemId={file.id}
                      itemName={file.name}
                      itemKind="fotoğraf"
                      onDeleted={() => handleItemDeleted(file.id)}
                      className="absolute right-1 top-1 bg-white/90 shadow-sm"
                    />
                  </div>
                ))}
              </div>
              </div>
            </div>
          )}

          {otherFiles.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Diğer dosyalar ({otherFiles.length})
              </p>
              <ul className="max-h-40 divide-y divide-slate-100 overflow-y-auto overscroll-y-contain rounded-xl border border-slate-100">
                {otherFiles.map((file) => (
                  <li key={file.id} className="flex items-center">
                    {file.webViewLink ? (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-sm text-blue-800 hover:bg-slate-50"
                      >
                        <FileIcon className="h-5 w-5 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      </a>
                    ) : (
                      <span className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-sm text-slate-600">
                        <FileIcon className="h-5 w-5 shrink-0 text-slate-400" />
                        {file.name}
                      </span>
                    )}
                    <DeleteItemButton
                      itemId={file.id}
                      itemName={file.name}
                      itemKind="dosya"
                      onDeleted={() => handleItemDeleted(file.id)}
                      className="mr-2"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.folders.length === 0 && data.files.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              Bu klasör boş
            </p>
          )}
        </div>
      ) : null}

      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewFile(null)}
          role="dialog"
          aria-modal
        >
          <div
            className="relative max-h-full max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-10 inset-x-0 flex items-center justify-between gap-2">
              <DeleteItemButton
                itemId={previewFile.id}
                itemName={previewFile.name}
                itemKind="fotoğraf"
                onDeleted={() => handleItemDeleted(previewFile.id)}
                iconOnly={false}
                className="!text-white hover:!bg-white/10"
              />
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="text-sm font-medium text-white"
              >
                Kapat ✕
              </button>
            </div>
            {previewFile.thumbnailLink ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewFile.thumbnailLink.replace(/=s\d+/, "=s1200")}
                alt={previewFile.name}
                className="max-h-[80vh] max-w-full rounded-lg object-contain"
              />
            ) : (
              <p className="text-white">Önizleme kullanılamıyor</p>
            )}
            <p className="mt-2 truncate text-center text-sm text-white/90">
              {previewFile.name}
            </p>
            {previewFile.webViewLink && (
              <a
                href={previewFile.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-center text-sm font-medium text-blue-300 underline"
              >
                Drive&apos;da aç
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Spinner() {
  return (
    <div
      className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-700 border-t-transparent"
      role="status"
    />
  );
}

function FolderIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}

function ChevronIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function FileIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
