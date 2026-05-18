"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { DeleteItemButton } from "@/components/DeleteItemButton";
import { NavigationBar } from "@/components/NavigationBar";
import { parseApiResponse } from "@/lib/api/parseResponse";
import { useToast } from "@/components/ui/Toast";
import { useKeyboard } from "@/lib/hooks/useKeyboard";
import { Button } from "@/components/ui/Button";

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
  const { showToast } = useToast();
  const [folderNav, setFolderNav] = useState({
    stack: [{ id: rootFolderId, name: rootFolderName }] as Breadcrumb[],
    index: 0,
  });
  const [data, setData] = useState<BrowseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<BrowseFile | null>(null);
  const [browseQuery, setBrowseQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
    kind: "folder" | "file";
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const { stack: navStack, index: navIndex } = folderNav;
  const breadcrumbs = navStack.slice(0, navIndex + 1);
  const currentFolderId = navStack[navIndex]?.id ?? rootFolderId;
  const canGoBack = navIndex > 0;
  const canGoForward = navIndex < navStack.length - 1;

  useKeyboard(
    {
      Escape: () => {
        if (previewFile) {
          setPreviewFile(null);
        } else if (renameTarget) {
          setRenameTarget(null);
        }
      },
      ArrowLeft: () => {
        if (!previewFile && canGoBack) {
          setFolderNav((prev) => ({ ...prev, index: prev.index - 1 }));
        }
      },
      ArrowRight: () => {
        if (!previewFile && canGoForward) {
          setFolderNav((prev) => ({ ...prev, index: prev.index + 1 }));
        }
      },
    },
    { enabled: !loading },
  );

  const loadFolder = useCallback(async (folderId: string) => {
    setLoading(true);
    setNextPageToken(undefined);
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
      setNextPageToken(
        typeof payload.nextPageToken === "string"
          ? payload.nextPageToken
          : undefined,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Klasör içeriği yüklenemedi.",
      );
      setData(null);
      setNextPageToken(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadMore() {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/drive/browse?folderId=${encodeURIComponent(currentFolderId)}&pageToken=${encodeURIComponent(nextPageToken)}`,
      );
      const { data: payload, ok } = await parseApiResponse(res);
      if (!ok || !payload.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Daha fazla içerik yüklenemedi.",
        );
      }
      const moreFolders = (payload.folders as BrowseFolder[]) ?? [];
      const moreFiles = (payload.files as BrowseFile[]) ?? [];
      setData((prev) =>
        prev
          ? {
              ...prev,
              folders: [...prev.folders, ...moreFolders],
              files: [...prev.files, ...moreFiles],
            }
          : prev,
      );
      setNextPageToken(
        typeof payload.nextPageToken === "string"
          ? payload.nextPageToken
          : undefined,
      );
    } catch (err) {
      showToast({
        message:
          err instanceof Error ? err.message : "Sayfa yüklenemedi.",
        variant: "error",
      });
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadFolder(currentFolderId);
  }, [currentFolderId, loadFolder]);

  useEffect(() => {
    setBrowseQuery("");
  }, [currentFolderId]);

  useEffect(() => {
    if (!renameTarget) return;
    const t = setTimeout(() => renameInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [renameTarget]);

  function openRename(id: string, name: string, kind: "folder" | "file") {
    setRenameTarget({ id, name, kind });
    setRenameValue(name);
  }

  async function submitRename() {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name) {
      showToast({ message: "Ad boş olamaz.", variant: "error" });
      return;
    }
    setRenaming(true);
    try {
      const res = await fetch("/api/drive/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: renameTarget.id, name }),
      });
      const { data: payload, ok } = await parseApiResponse(res);
      if (!ok || !payload.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Yeniden adlandırılamadı.",
        );
      }
      const item = payload.item as { id: string; name: string };
      setFolderNav((prev) => ({
        ...prev,
        stack: prev.stack.map((b) =>
          b.id === item.id ? { ...b, name: item.name } : b,
        ),
      }));
      if (previewFile?.id === item.id) {
        setPreviewFile((p) => (p ? { ...p, name: item.name } : null));
      }
      setRenameTarget(null);
      showToast({ message: "Ad güncellendi.", variant: "success" });
      await loadFolder(currentFolderId);
    } catch (err) {
      showToast({
        message:
          err instanceof Error ? err.message : "Yeniden adlandırılamadı.",
        variant: "error",
      });
    } finally {
      setRenaming(false);
    }
  }

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

  const q = browseQuery.trim().toLowerCase();
  const matches = (name: string) => !q || name.toLowerCase().includes(q);

  const imageFiles =
    data?.files.filter((f) => isImageMime(f.mimeType)) ?? [];
  const otherFiles =
    data?.files.filter((f) => !isImageMime(f.mimeType)) ?? [];

  const filteredFolders = data?.folders.filter((f) => matches(f.name)) ?? [];
  const filteredImageFiles = imageFiles.filter((f) => matches(f.name));
  const filteredOtherFiles = otherFiles.filter((f) => matches(f.name));

  const folderLabel = data
    ? q
      ? `Klasörler (${filteredFolders.length}/${data.folders.length})`
      : `Klasörler (${data.folders.length})`
    : "";
  const photoLabel = data
    ? q
      ? `Fotoğraflar (${filteredImageFiles.length}/${imageFiles.length})`
      : `Fotoğraflar (${imageFiles.length})`
    : "";
  const otherLabel = data
    ? q
      ? `Diğer dosyalar (${filteredOtherFiles.length}/${otherFiles.length})`
      : `Diğer dosyalar (${otherFiles.length})`
    : "";

  const hasAnyContent =
    data &&
    (data.folders.length > 0 ||
      imageFiles.length > 0 ||
      otherFiles.length > 0);
  const hasFiltered =
    filteredFolders.length > 0 ||
    filteredImageFiles.length > 0 ||
    filteredOtherFiles.length > 0;

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

      {!loading && !error && data && hasAnyContent && (
        <div className="relative mb-4">
          <SearchGlyph className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={browseQuery}
            onChange={(e) => setBrowseQuery(e.target.value)}
            placeholder="Bu klasörde ara..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-800 focus:bg-white focus:ring-2 focus:ring-blue-800/15"
            aria-label="Klasör içeriğinde ara"
          />
        </div>
      )}

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
                {folderLabel}
              </p>
              {filteredFolders.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  Aramaya uygun klasör yok
                </p>
              ) : (
                <ul className="scroll-panel divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                  {filteredFolders.map((folder) => (
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
                      <button
                        type="button"
                        className="mr-1 shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-800"
                        aria-label={`${folder.name} yeniden adlandır`}
                        title="Yeniden adlandır"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRename(folder.id, folder.name, "folder");
                        }}
                      >
                        <PencilIcon className="h-4 w-4" />
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
              )}
            </div>
          )}

          {imageFiles.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {photoLabel}
              </p>
              {filteredImageFiles.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  Aramaya uygun fotoğraf yok
                </p>
              ) : (
                <div className="scroll-panel rounded-lg border border-slate-100 bg-slate-50/40 p-2">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {filteredImageFiles.map((file) => (
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
                        <button
                          type="button"
                          className="absolute left-1 top-1 rounded-full bg-white/90 p-1 text-slate-600 shadow-sm hover:text-blue-800"
                          aria-label="Yeniden adlandır"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRename(file.id, file.name, "file");
                          }}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
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
              )}
            </div>
          )}

          {otherFiles.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {otherLabel}
              </p>
              {filteredOtherFiles.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  Aramaya uygun dosya yok
                </p>
              ) : (
                <ul className="scroll-panel divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                  {filteredOtherFiles.map((file) => (
                    <li key={file.id} className="flex items-center">
                      {file.webViewLink ? (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-sm text-blue-800 hover:bg-slate-50"
                        >
                          <FileIcon className="h-5 w-5 shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1 truncate">
                            {file.name}
                          </span>
                        </a>
                      ) : (
                        <span className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-sm text-slate-600">
                          <FileIcon className="h-5 w-5 shrink-0 text-slate-400" />
                          {file.name}
                        </span>
                      )}
                      <button
                        type="button"
                        className="mr-1 shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-800"
                        aria-label="Yeniden adlandır"
                        onClick={() => openRename(file.id, file.name, "file")}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
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
              )}
            </div>
          )}

          {data.folders.length === 0 && data.files.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              Bu klasör boş
            </p>
          )}
          {hasAnyContent && !hasFiltered && q && (
            <p className="py-6 text-center text-sm text-slate-500">
              «{browseQuery}» için sonuç yok
            </p>
          )}

          {nextPageToken && !loading && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadMore()}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-900 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMore ? "Yükleniyor…" : "Daha fazla yükle"}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {renameTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Kapat"
            onClick={() => !renaming && setRenameTarget(null)}
          />
          <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2
              id="rename-title"
              className="text-lg font-semibold text-slate-900"
            >
              Yeniden adlandır
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {renameTarget.kind === "folder" ? "Klasör" : "Dosya"}
            </p>
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              disabled={renaming}
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15 disabled:bg-slate-100"
            />
            <div className="mt-4 flex gap-3">
              <Button
                variant="neutral"
                className="flex-1"
                disabled={renaming}
                onClick={() => setRenameTarget(null)}
              >
                İptal
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                disabled={renaming || !renameValue.trim()}
                onClick={() => void submitRename()}
              >
                {renaming ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {previewFile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewFile(null)}
          role="dialog"
          aria-modal
        >
          <div
            className="relative flex h-full w-full flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-12 inset-x-0 z-10 flex items-center justify-between gap-2">
              <DeleteItemButton
                itemId={previewFile.id}
                itemName={previewFile.name}
                itemKind="fotoğraf"
                onDeleted={() => handleItemDeleted(previewFile.id)}
                iconOnly={false}
                className="!text-white hover:!bg-white/10"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">Kaydır: ⌊+⌈ uzaklaştır/yakınlaştır</span>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
                >
                  Kapat ✕
                </button>
              </div>
            </div>
            {previewFile.thumbnailLink ? (
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                doubleClick={{ mode: "toggle" }}
              >
                <TransformComponent>
                  <img
                    src={previewFile.thumbnailLink.replace(/=s\d+/, "=s1200")}
                    alt={previewFile.name}
                    className="max-h-[85vh] max-w-full rounded-lg object-contain"
                    draggable={false}
                  />
                </TransformComponent>
              </TransformWrapper>
            ) : (
              <p className="text-white">Önizleme kullanılamıyor</p>
            )}
            <p className="mt-4 truncate text-center text-sm text-white/90">
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
        </motion.div>
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

function SearchGlyph({ className }: { className?: string }) {
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
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
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
