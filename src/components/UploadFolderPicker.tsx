"use client";

import { useCallback, useEffect, useState } from "react";
import { parseApiResponse } from "@/lib/api/parseResponse";
import { RenameItemDialog } from "@/components/ui/RenameItemDialog";
import { getTodayDateInputValue } from "@/lib/drive/folderNaming";
import { useToast } from "@/components/ui/Toast";
import { motion } from "framer-motion";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { DeleteItemButton } from "@/components/DeleteItemButton";

export type PickerFolder = { id: string; name: string };
export type BrowseFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
};

function isMediaMime(mime: string) {
  return mime.startsWith("image/") || mime.startsWith("video/");
}

type Props = {
  business: PickerFolder;
  busy?: boolean;
  stack: PickerFolder[];
  onStackChange: (stack: PickerFolder[]) => void;
  onGoBack?: () => void;
  uploadStatus?: string;
  /** true: silme ve yeniden adlandırma gösterilir */
  manageMode?: boolean;
};

export function UploadFolderPicker({
  business,
  busy,
  stack,
  onStackChange,
  onGoBack,
  uploadStatus,
  manageMode = false,
}: Props) {
  const { showToast } = useToast();
  const [subfolders, setSubfolders] = useState<PickerFolder[]>([]);
  const [files, setFiles] = useState<BrowseFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string; kind: "folder" | "file" } | null>(null);
  const [previewFile, setPreviewFile] = useState<BrowseFile | null>(null);

  const [newFolderName, setNewFolderName] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayDateInputValue());
  const [creatingFolder, setCreatingFolder] = useState(false);

  const current = stack[stack.length - 1] ?? { id: business.id, name: business.name };

  function applyRename(item: { id: string; name: string }) {
    onStackChange(
      stack.map((f) => (f.id === item.id ? { ...f, name: item.name } : f)),
    );
    setSubfolders((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, name: item.name } : f)),
    );
    setFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, name: item.name } : f)),
    );
  }

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
              : "Klasör içeriği yüklenemedi.",
          );
        }
        const list = (data.folders as PickerFolder[]) ?? [];
        const fileList = (data.files as BrowseFile[]) ?? [];
        setSubfolders((prev) =>
          append ? [...prev, ...list] : list,
        );
        setFiles((prev) =>
          append ? [...prev, ...fileList] : fileList,
        );
        setNextPageToken(
          typeof data.nextPageToken === "string"
            ? data.nextPageToken
            : undefined,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Hata");
        if (!append) {
          setSubfolders([]);
          setFiles([]);
        }
        setNextPageToken(undefined);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    setNextPageToken(undefined);
    void loadChildren(current.id, { append: false });
  }, [current.id, loadChildren]);

  useEffect(() => {
    if (uploadStatus === "success") {
      void loadChildren(current.id, { append: false });
    }
  }, [uploadStatus, current.id, loadChildren]);

  function enterFolder(folder: PickerFolder) {
    onStackChange([...stack, folder]);
  }

  function goUp() {
    if (stack.length > 1) {
      onStackChange(stack.slice(0, -1));
    }
  }

  function goToCrumb(index: number) {
    onStackChange(stack.slice(0, index + 1));
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    setCreatingFolder(true);
    try {
      const res = await fetch("/api/drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentFolderId: current.id, name }),
      });
      const { data, ok } = await parseApiResponse(res);
      if (!ok || !data.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Klasör oluşturulamadı."
        );
      }
      setNewFolderName("");
      showToast({
        message: data.created ? `"${name}" oluşturuldu.` : `"${name}" zaten mevcut.`,
        variant: "success",
      });
      void loadChildren(current.id, { append: false });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Klasör oluşturulamadı.",
        variant: "error",
      });
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleCreateDatedFolder() {
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/drive/visit-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessFolderId: business.id,
          businessName: business.name,
          visitDate: selectedDate,
        }),
      });
      const { data, ok } = await parseApiResponse(res);
      const folder = data.folder as { id?: string; name?: string } | undefined;
      if (!ok || !data.ok || !folder?.id) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Tarihli klasör oluşturulamadı."
        );
      }
      showToast({
        message: data.created
          ? "Tarihli klasör oluşturuldu."
          : "Seçilen tarihli klasör zaten mevcut.",
        variant: "success",
      });
      void loadChildren(current.id, { append: false });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Tarihli klasör oluşturulamadı.",
        variant: "error",
      });
    } finally {
      setCreatingFolder(false);
    }
  }

  return (
    <div className="surface-card p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
          {manageMode ? "İçerik yönetimi" : "Klasör seç"}
        </p>
        <p className="mt-0.5 text-sm text-slate-600">
          {manageMode
            ? "Dosya ve klasörleri yeniden adlandırın veya silin"
            : "İşletme içinde klasörlere girip yükleme hedefini seçin"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
        {onGoBack && (
          <span className="flex items-center gap-1">
            <button
              type="button"
              disabled={busy}
              onClick={onGoBack}
              className="text-blue-700 hover:underline font-semibold rounded px-1 py-0.5 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              İşletmeler
            </button>
            <span className="text-slate-300">/</span>
          </span>
        )}
        {stack.map((crumb, index) => (
          <span key={crumb.id} className="flex items-center gap-1">
            {index > 0 && <span className="text-slate-300">/</span>}
            <button
              type="button"
              disabled={busy}
              onClick={() => goToCrumb(index)}
              className={`max-w-[7rem] truncate rounded px-1 py-0.5 font-medium transition-colors hover:bg-slate-100 disabled:opacity-50 ${
                index === stack.length - 1
                  ? "text-blue-900 font-bold"
                  : "text-blue-700 hover:underline"
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {error && (
        <p className="text-center text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="max-h-[26rem] overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/50 p-2 space-y-4 scroll-panel">
        {loading ? (
          <p className="px-3 py-6 text-center text-sm text-slate-500">Yükleniyor…</p>
        ) : subfolders.length === 0 && files.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-slate-500">
            Bu klasör boş
          </p>
        ) : (
          <div className="space-y-4">
            {/* Alt Klasörler */}
            {subfolders.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Klasörler ({subfolders.length})
                </p>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                  {subfolders.map((f) => (
                    <li key={f.id} className="flex items-center">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => enterFolder(f)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3.5 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50"
                      >
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                        <span className="shrink-0 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-md font-semibold">İçine Git →</span>
                      </button>
                      {manageMode && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setRenameTarget({ id: f.id, name: f.name, kind: "folder" })}
                            className="mr-1 shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-800 disabled:opacity-50"
                            aria-label={`${f.name} yeniden adlandır`}
                            title="Yeniden adlandır"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <DeleteItemButton
                            itemId={f.id}
                            itemName={f.name}
                            itemKind="klasör"
                            onDeleted={() => void loadChildren(current.id, { append: false })}
                            className="mr-2"
                          />
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fotoğraflar & Videolar */}
            {files.filter((file) => isMediaMime(file.mimeType)).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fotoğraflar & Videolar ({files.filter((file) => isMediaMime(file.mimeType)).length})
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 bg-white p-2 rounded-lg border border-slate-100">
                  {files
                    .filter((file) => isMediaMime(file.mimeType))
                    .map((file) => (
                      <div
                        key={file.id}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                      >
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="h-full w-full text-left"
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
                        {manageMode && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              className="absolute left-1 top-1 rounded-full bg-white/90 p-1 text-slate-600 shadow-sm hover:text-blue-800 disabled:opacity-50"
                              aria-label="Yeniden adlandır"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameTarget({ id: file.id, name: file.name, kind: "file" });
                              }}
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                            </button>
                            <DeleteItemButton
                              itemId={file.id}
                              itemName={file.name}
                              itemKind="fotoğraf"
                              onDeleted={() => void loadChildren(current.id, { append: false })}
                              className="absolute right-1 top-1 bg-white/90 shadow-sm"
                            />
                          </>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Diğer Dosyalar */}
            {files.filter((file) => !isMediaMime(file.mimeType)).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Diğer Dosyalar ({files.filter((file) => !isMediaMime(file.mimeType)).length})
                </p>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                  {files
                    .filter((file) => !isMediaMime(file.mimeType))
                    .map((file) => (
                      <li key={file.id} className="flex items-center">
                        {file.webViewLink ? (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-sm text-blue-800 hover:bg-slate-50"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {file.name}
                            </span>
                          </a>
                        ) : (
                          <span className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-sm text-slate-600">
                            {file.name}
                          </span>
                        )}
                        {manageMode && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              className="mr-1 shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-800 disabled:opacity-50"
                              aria-label="Yeniden adlandır"
                              onClick={() => setRenameTarget({ id: file.id, name: file.name, kind: "file" })}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <DeleteItemButton
                              itemId={file.id}
                              itemName={file.name}
                              itemKind="dosya"
                              onDeleted={() => void loadChildren(current.id, { append: false })}
                              className="mr-2"
                            />
                          </>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
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
          className="w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-blue-900 hover:bg-slate-50 disabled:opacity-50"
        >
          {loadingMore ? "Yükleniyor…" : "Daha fazla klasör"}
        </button>
      )}

      {/* Klasör Oluşturma Bölümü */}
      <div className="border-t border-slate-100 pt-3 space-y-3">
        {stack.length === 1 && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-blue-800">
              Yeni Tarihli Klasör
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={selectedDate}
                disabled={busy || creatingFolder}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
              <button
                type="button"
                onClick={handleCreateDatedFolder}
                disabled={busy || creatingFolder}
                className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
              >
                {creatingFolder ? "..." : "Oluştur"}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateFolder} className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-blue-800">
            Yeni Özel Klasör
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              disabled={busy || creatingFolder}
              placeholder="Yeni alan adı (örn. Pano)"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15 disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={busy || creatingFolder || !newFolderName.trim()}
              className="shrink-0 rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingFolder ? "..." : "Oluştur"}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row pt-2 border-t border-slate-100">
        {stack.length > 1 ? (
          <button
            type="button"
            disabled={busy}
            onClick={goUp}
            className="btn-secondary shrink-0 py-2.5 text-sm sm:flex-1 animate-fadeIn"
          >
            ← Üst klasör
          </button>
        ) : (
          onGoBack && (
            <button
              type="button"
              disabled={busy}
              onClick={onGoBack}
              className="btn-secondary shrink-0 py-2.5 text-sm sm:flex-1"
            >
              ← İşletmeler
            </button>
          )
        )}
        {manageMode && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setRenameTarget({ id: current.id, name: current.name, kind: "folder" })}
            className="btn-secondary py-2.5 text-sm sm:flex-1"
          >
            Açık klasörü yeniden adlandır
          </button>
        )}
      </div>

      {manageMode && (
        <RenameItemDialog
        open={!!renameTarget}
        itemId={renameTarget?.id ?? ""}
        itemName={renameTarget?.name ?? ""}
        itemKind={renameTarget?.kind === "folder" ? "klasör" : "dosya"}
        onClose={() => setRenameTarget(null)}
        onRenamed={(item) => {
          applyRename(item);
          setRenameTarget(null);
          void loadChildren(current.id, { append: false });
        }}
        />
      )}

      {previewFile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          role="dialog"
          aria-modal
        >
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between gap-3 bg-black/60 px-4 py-3 text-white backdrop-blur-md border-b border-white/10">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white/90">
                {previewFile.name}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {manageMode && (
                <DeleteItemButton
                  itemId={previewFile.id}
                  itemName={previewFile.name}
                  itemKind="fotoğraf"
                  onDeleted={() => {
                    setPreviewFile(null);
                    void loadChildren(current.id, { append: false });
                  }}
                  iconOnly={false}
                  className="!text-white hover:!bg-white/10"
                />
              )}
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/25 active:scale-95"
              >
                Geri ✕
              </button>
            </div>
          </div>

          {/* Zoomable Image Container */}
          <div
            className="relative flex flex-1 items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <div
              className="relative flex h-full w-full items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {previewFile.thumbnailLink ? (
                <TransformWrapper
                  initialScale={1}
                  minScale={0.5}
                  maxScale={4}
                  doubleClick={{ mode: "toggle" }}
                >
                  <TransformComponent>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewFile.thumbnailLink.replace(/=s\d+/, "=s1200")}
                      alt={previewFile.name}
                      className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
                      draggable={false}
                    />
                  </TransformComponent>
                </TransformWrapper>
              ) : (
                <p className="text-white/70 text-sm">Önizleme kullanılamıyor</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
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
