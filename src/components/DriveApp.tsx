"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseApiResponse } from "@/lib/api/parseResponse";
import { compressImageForUpload } from "@/lib/client/compressImage";
import {
  isUploadableMediaFile,
  isVideoFile,
} from "@/lib/mediaTypes";
import {
  enqueueOfflineUpload,
  flushOfflineUploadQueue,
  getOfflineQueueSize,
} from "@/lib/client/offlineUploadQueue";
import { isTransientNetworkError } from "@/lib/client/networkErrors";
import {
  buildPhotoUploadFileName,
  getUploadFilenameTemplate,
} from "@/lib/client/uploadFilename";
import { UploadFolderPicker } from "@/components/UploadFolderPicker";
import { FieldUploadPanel } from "@/components/FieldUploadUI";
import { WelcomeModal } from "@/components/WelcomeModal";
import { DeleteItemButton } from "@/components/DeleteItemButton";
import {
  isWelcomeDismissed,
  setWelcomeDismissed,
  isUpdatesDismissed,
  setUpdatesDismissed,
} from "@/lib/client/welcomeStorage";
import { useToast } from "@/components/ui/Toast";
import { useAudio } from "@/lib/hooks/useAudio";

type Business = { id: string; name: string };
type UploadTarget = { id: string; name: string };

type ConnectionState =
  | { status: "loading" }
  | {
      status: "connected";
      rootFolderId: string;
      rootFolderName: string;
      email: string;
    }
  | { status: "error"; message: string };

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; current: number; total: number; failed: UploadFailure[] }
  | { status: "success"; count: number }
  | { status: "error"; message: string; failed: UploadFailure[] };

type UploadFailure = { id: string; name: string; error: string };

class NetworkUploadError extends Error {
  override name = "NetworkUploadError";
  constructor(message = "Ağ bağlantısı kesildi.") {
    super(message);
  }
}

const MAX_MEDIA_ITEMS = 100;
/** Vercel timeout riskini azaltmak için paket başına yükleme adedi */
const UPLOAD_CHUNK_SIZE = 10;

export function DriveApp() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { playSound } = useAudio();

  const [connection, setConnection] = useState<ConnectionState>({
    status: "loading",
  });
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [confirmedStack, setConfirmedStack] = useState<{ id: string; name: string }[]>([]);
  const dateFolder = confirmedStack[confirmedStack.length - 1] ?? null;
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [businessesError, setBusinessesError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastUploadCount, setLastUploadCount] = useState(0);
  const [compressingPhotos, setCompressingPhotos] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [flushingOffline, setFlushingOffline] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);

  useEffect(() => {
    if (!isWelcomeDismissed()) {
      setWelcomeOpen(true);
    } else if (!isUpdatesDismissed()) {
      setUpdatesOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = window.setTimeout(() => setShowSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  function handleWelcomeClose(dismissPermanently: boolean) {
    if (dismissPermanently) {
      setWelcomeDismissed();
    }
    setWelcomeOpen(false);
    if (!isUpdatesDismissed()) {
      setUpdatesOpen(true);
    }
  }

  function handleUpdatesClose() {
    setUpdatesDismissed();
    setUpdatesOpen(false);
  }

  const loadBusinesses = useCallback(async () => {
    setLoadingBusinesses(true);
    setBusinessesError(null);
    try {
      const res = await fetch("/api/drive/businesses");
      const { data, ok } = await parseApiResponse(res);
      if (!ok || !data.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "İşletmeler yüklenemedi.",
        );
      }
      const list = (data.businesses as Business[] | undefined) ?? [];
      setBusinesses(list);
      setFilteredBusinesses(list);
    } catch (err) {
      setBusinessesError(
        err instanceof Error ? err.message : "İşletmeler yüklenemedi.",
      );
    } finally {
      setLoadingBusinesses(false);
    }
  }, []);

  const refreshOfflineCount = useCallback(async () => {
    try {
      const n = await getOfflineQueueSize();
      setOfflineQueueCount(n);
    } catch {
      setOfflineQueueCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshOfflineCount();
  }, [refreshOfflineCount]);

  useEffect(() => {
    function onOnline() {
      void refreshOfflineCount();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refreshOfflineCount]);

  const loadConnection = useCallback(async () => {
    setConnection({ status: "loading" });
    try {
      const res = await fetch("/api/drive/health");
      const { data, ok } = await parseApiResponse(res);
      if (!ok || !data.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Drive bağlantısı kurulamadı.",
        );
      }
      const rootFolder = data.rootFolder as
        | { id?: string; name?: string }
        | undefined;
      if (!rootFolder?.id) {
        throw new Error("Kök klasör bilgisi alınamadı.");
      }
      setConnection({
        status: "connected",
        rootFolderId: rootFolder.id,
        rootFolderName: rootFolder.name ?? "İşletmeler",
        email:
          typeof data.accountEmail === "string" ? data.accountEmail : "",
      });
      await loadBusinesses();
    } catch (err) {
      setConnection({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Drive bağlantısı kurulamadı.",
      });
    }
  }, [loadBusinesses]);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  useEffect(() => {
    if (!selectedBusiness) {
      setConfirmedStack([]);
    }
  }, [selectedBusiness]);



  useEffect(() => {
    const queryLower = searchQuery.trim().toLowerCase();
    if (!queryLower) {
      setFilteredBusinesses(businesses);
    } else {
      setFilteredBusinesses(
        businesses.filter((b) => b.name.toLowerCase().includes(queryLower)),
      );
    }
  }, [searchQuery, businesses]);

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetUploadUi() {
    setUploadState({ status: "idle" });
    resetFileInput();
  }

  function canStartUpload(): boolean {
    if (!selectedBusiness) {
      showToast({ message: "Önce bir işletme seçin.", variant: "error" });
      return false;
    }
    if (!dateFolder?.id) {
      showToast({
        message: "Hedef klasör seçilmedi.",
        variant: "info",
      });
      return false;
    }
    return true;
  }

  async function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files;
    if (!picked?.length) return;
    if (!canStartUpload()) {
      e.target.value = "";
      return;
    }

    const mediaFiles = Array.from(picked).filter(isUploadableMediaFile);

    if (!mediaFiles.length) {
      showToast({
        message: "Geçerli fotoğraf veya video bulunamadı.",
        variant: "error",
      });
      e.target.value = "";
      return;
    }

    let filesToUpload = mediaFiles;
    if (filesToUpload.length > MAX_MEDIA_ITEMS) {
      showToast({
        message: `En fazla ${MAX_MEDIA_ITEMS} dosya. İlk ${MAX_MEDIA_ITEMS} dosya yüklenecek.`,
        variant: "info",
      });
      filesToUpload = filesToUpload.slice(0, MAX_MEDIA_ITEMS);
    }

    const heicHint = filesToUpload.some(
      (f) =>
        /^image\/(heic|heif)/i.test(f.type) ||
        /\.(heic|heif)$/i.test(f.name),
    );
    if (heicHint) {
      showToast({
        message:
          "HEIC/HEIF bazı tarayıcılarda sıkıştırılamaz; yükleme başarısız olabilir.",
        variant: "info",
      });
    }

    try {
      await performUpload(filesToUpload);
    } catch (err) {
      showToast({
        message:
          err instanceof Error ? err.message : "Yükleme başlatılamadı.",
        variant: "error",
      });
    } finally {
      e.target.value = "";
    }
  }

  function openAddBusinessModal() {
    setNewBusinessName("");
    setCreateError(null);
    setIsAddModalOpen(true);
  }

  function closeAddBusinessModal() {
    if (creatingFolder) return;
    setIsAddModalOpen(false);
    setNewBusinessName("");
    setCreateError(null);
  }

  function clearBusinessSelection() {
    setSelectedBusiness(null);
    setConfirmedStack([]);
    resetUploadUi();
  }

  function getUploadTarget(): UploadTarget {
    if (!dateFolder?.id) {
      throw new Error("Lütfen önce bir hedef klasör seçin.");
    }
    return dateFolder;
  }

  function handleSelectBusiness(business: Business) {
    setSelectedBusiness(business);
    setConfirmedStack([{ id: business.id, name: business.name }]);
    setSearchQuery("");
    resetUploadUi();
  }

  async function handleCreateBusinessFromModal(e?: React.FormEvent) {
    e?.preventDefault();
    const name = newBusinessName.trim();
    if (!name) {
      setCreateError("İşletme adı gerekli.");
      return;
    }

    setCreatingFolder(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const { data, ok } = await parseApiResponse(res);
      const folder = data.folder as Business | undefined;
      if (!ok || !data.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Klasör oluşturulamadı.",
        );
      }
      if (!folder?.id) {
        throw new Error("İşletme klasörü oluşturulamadı.");
      }
      setIsAddModalOpen(false);
      setNewBusinessName("");
      setSelectedBusiness(folder);
      setSearchQuery("");
      resetUploadUi();
      await loadBusinesses();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Klasör oluşturulamadı.",
      );
    } finally {
      setCreatingFolder(false);
    }
  }

  async function uploadSinglePhoto(
    file: File,
    folderId: string,
    uploadName?: string,
  ) {
    const formData = new FormData();
    formData.append("folderId", folderId);
    const name = (uploadName ?? file.name).trim() || file.name;
    formData.append("file", file, name);

    let res: Response;
    try {
      res = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      if (typeof navigator !== "undefined" && isTransientNetworkError(err)) {
        throw new NetworkUploadError();
      }
      throw err;
    }

    const { data, ok } = await parseApiResponse(res);
    if (!ok || !data.ok) {
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : `${file.name} yüklenemedi.`,
      );
    }
    return data;
  }

  async function handleFlushOfflineQueue() {
    setFlushingOffline(true);
    try {
      const { uploaded, failed } = await flushOfflineUploadQueue(
        async (row) => {
          const file = new File([row.blob], row.fileName, {
            type: row.mimeType,
          });
          await uploadSinglePhoto(file, row.folderId, row.fileName);
        },
      );
      await refreshOfflineCount();
      if (uploaded > 0) {
        showToast({
          message:
            `Başarıyla tamamlandı.\n\n` +
            `${uploaded} adet bekleyen fotoğraf Google Drive'a yüklenmiştir.`,
          variant: "success",
        });
      }
      if (failed > 0) {
        showToast({
          message: `${failed} kuyruk öğesi yüklenemedi; kayıtlar korundu.`,
          variant: "error",
        });
      }
      if (uploaded === 0 && failed === 0) {
        showToast({
          message: "Kuyrukta bekleyen fotoğraf yok.",
          variant: "info",
        });
      }
    } catch (err) {
      showToast({
        message:
          err instanceof Error ? err.message : "Kuyruk işlenemedi.",
        variant: "error",
      });
    } finally {
      setFlushingOffline(false);
    }
  }

  async function recordUploadFailure(
    reason: unknown,
    photo: { id: string; file: File },
    uploadTarget: UploadTarget,
    uploadName: string,
    failed: UploadFailure[],
  ) {
    if (reason instanceof NetworkUploadError) {
      try {
        await enqueueOfflineUpload({
          folderId: uploadTarget.id,
          fileName: uploadName,
          mimeType: photo.file.type || "image/jpeg",
          blob: await photo.file.arrayBuffer(),
        });
        await refreshOfflineCount();
        failed.push({
          id: photo.id,
          name: photo.file.name,
          error: "Çevrimdışı kuyruğa alındı",
        });
        return;
      } catch {
        /* fall through */
      }
    }
    failed.push({
      id: photo.id,
      name: photo.file.name,
      error:
        reason instanceof Error ? reason.message : "Yükleme başarısız",
    });
  }

  async function performUpload(
    files: File[],
    opts?: { manageOverlay?: boolean; skipCompression?: boolean },
  ) {
    if (!files.length || !selectedBusiness) return;

    const manageOverlay = opts?.manageOverlay !== false;
    const skipCompression = opts?.skipCompression === true;

    let uploadTarget: UploadTarget;
    try {
      uploadTarget = getUploadTarget();
    } catch (err) {
      showToast({
        message:
          err instanceof Error
            ? err.message
            : "Yükleme hedefi hazırlanamadı.",
        variant: "error",
      });
      return;
    }

    if (manageOverlay) {
      setIsUploading(true);
      setShowSuccess(false);
    }

    const total = files.length;
    const failed: UploadFailure[] = [];
    let uploaded = 0;
    const template = getUploadFilenameTemplate();
    const visitLabel = uploadTarget.name;
    const runId = Date.now();

    setUploadState({ status: "uploading", current: 0, total, failed });

    try {
      for (let chunkStart = 0; chunkStart < files.length; chunkStart += UPLOAD_CHUNK_SIZE) {
        const chunkRaw = files.slice(chunkStart, chunkStart + UPLOAD_CHUNK_SIZE);

        const chunkHasImages = chunkRaw.some((f) => !isVideoFile(f));
        if (chunkHasImages && !skipCompression) {
          setCompressingPhotos(true);
        }
        let chunkFiles: File[];
        try {
          chunkFiles = await Promise.all(
            chunkRaw.map(async (f) => {
              if (skipCompression || isVideoFile(f)) return f;
              return compressImageForUpload(f);
            }),
          );
        } finally {
          if (chunkHasImages && !skipCompression) {
            setCompressingPhotos(false);
          }
        }

        for (let j = 0; j < chunkFiles.length; j++) {
          const globalIdx = chunkStart + j + 1;
          const file = chunkFiles[j];
          const photo = {
            id: `upload-${runId}-${globalIdx}`,
            file,
          };
          const uploadName = buildPhotoUploadFileName(template, {
            business: selectedBusiness.name,
            visit: visitLabel,
            index: globalIdx,
            originalName: file.name,
          });

          try {
            await uploadSinglePhoto(file, uploadTarget.id, uploadName);
            uploaded++;
          } catch (reason) {
            await recordUploadFailure(
              reason,
              photo,
              uploadTarget,
              uploadName,
              failed,
            );
          }

          setUploadState({
            status: "uploading",
            current: uploaded,
            total,
            failed,
          });
        }
      }

      if (failed.length === 0) {
        setUploadState({ status: "success", count: uploaded });
        setLastUploadCount(uploaded);
        setShowSuccess(true);
        playSound("success");
        resetUploadUi();
        return;
      }

      setUploadState({
        status: "error",
        message:
          `${uploaded} / ${total} adet fotoğraf Google Drive'a yüklenmiştir.\n\n` +
          `${failed.length} adet yüklenemedi veya çevrimdışı kuyruğa alındı.`,
        failed,
      });
      showToast({
        message:
          `Dikkat: ${failed.length} adet fotoğraf yüklenemedi.\n\n` +
          `${uploaded} / ${total} adet fotoğraf aktarılmıştır.`,
        variant: "error",
      });
      playSound("error");
    } finally {
      if (manageOverlay) {
        setIsUploading(false);
        resetFileInput();
      }
    }
  }

  const targetPreview = confirmedStack.length > 0
    ? confirmedStack.map((f) => f.name).join(" > ")
    : selectedBusiness?.name ?? "";
  const targetReady = !!dateFolder;
  const uploadBusy = isUploading || compressingPhotos;

  if (connection.status === "loading") {
    return (
      <>
        <div className="surface-card flex flex-col items-center justify-center px-6 py-16">
          <Spinner />
          <p className="mt-4 text-base font-medium text-slate-900">
            Google Drive&apos;a bağlanılıyor
          </p>
          <p className="mt-1 text-sm text-slate-600">Lütfen bekleyin…</p>
        </div>
        <WelcomeModal open={welcomeOpen} onClose={handleWelcomeClose} />
      </>
    );
  }

  if (connection.status === "error") {
    const needsUnlock =
      connection.message.toLowerCase().includes("yetkisiz") ||
      connection.message.toLowerCase().includes("unauthorized");
    return (
      <>
        <div className="surface-card p-6 text-center">
        <p className="text-lg font-semibold text-red-600">Drive bağlantısı yok</p>
        <p className="mt-2 text-sm text-slate-600">{connection.message}</p>
        <p className="mt-3 text-xs text-slate-500">
          OAuth veya ağ sorunu olabilir. Sorun sürerse yöneticinize bildirin.
        </p>
        {needsUnlock && (
          <p className="mt-4">
            <Link
              href="/unlock"
              className="text-sm font-semibold text-blue-800 underline"
            >
              Uygulama kilidini aç →
            </Link>
          </p>
        )}
        <button
          type="button"
          onClick={() => void loadConnection()}
          className="btn-primary mt-5"
        >
          Bağlantıyı yeniden dene
        </button>
        </div>
        <WelcomeModal open={welcomeOpen} onClose={handleWelcomeClose} />
        <UpdatesModal open={updatesOpen} onClose={handleUpdatesClose} />
      </>
    );
  }

  return (
    <div className="space-y-5">
      {offlineQueueCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              <span className="font-semibold">{offlineQueueCount}</span> fotoğraf
              çevrimdışı kuyrukta bekliyor.
            </span>
            <button
              type="button"
              disabled={flushingOffline}
              onClick={() => void handleFlushOfflineQueue()}
              className="shrink-0 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
            >
              {flushingOffline ? "Yükleniyor…" : "Şimdi yükle"}
            </button>
          </div>
        </div>
      )}

      {!selectedBusiness ? (
        <>
          <BusinessPicker
            connection={connection}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loadingBusinesses={loadingBusinesses}
            businessesError={businessesError}
            onRetryBusinesses={loadBusinesses}
            onRefreshBusinesses={loadBusinesses}
            filteredBusinesses={filteredBusinesses}
            onSelectBusiness={handleSelectBusiness}
            onOpenAddModal={openAddBusinessModal}
            onOpenUpdatesModal={() => setUpdatesOpen(true)}
          />
          <AddBusinessModal
            open={isAddModalOpen}
            name={newBusinessName}
            creating={creatingFolder}
            error={createError}
            onNameChange={setNewBusinessName}
            onSubmit={handleCreateBusinessFromModal}
            onClose={closeAddBusinessModal}
          />
        </>
      ) : (
        <>
          <UploadFolderPicker
            business={{ id: selectedBusiness.id, name: selectedBusiness.name }}
            busy={uploadBusy}
            stack={confirmedStack}
            onStackChange={setConfirmedStack}
            onGoBack={clearBusinessSelection}
            uploadStatus={uploadState.status}
          />

          {showSuccess && (
            <UploadSuccessBanner count={lastUploadCount} />
          )}

          <FieldUploadPanel
            fileInputRef={fileInputRef}
            uploadState={uploadState}
            targetReady={targetReady}
            uploadBusy={uploadBusy}
            onFileChange={(e) => void handleFileInputChange(e)}
            onPickPhotos={() => fileInputRef.current?.click()}
          />
        </>
      )}




      {uploadBusy && (
        <UploadLoadingOverlay
          uploaded={
            uploadState.status === "uploading" ? uploadState.current : 0
          }
          total={
            uploadState.status === "uploading"
              ? uploadState.total
              : uploadState.status === "success"
                ? uploadState.count
                : 0
          }
          compressing={compressingPhotos}
        />
      )}

      <WelcomeModal open={welcomeOpen} onClose={handleWelcomeClose} />
      <UpdatesModal open={updatesOpen} onClose={handleUpdatesClose} />
    </div>
  );
}

function UploadLoadingOverlay({
  uploaded,
  total,
  compressing,
}: {
  uploaded: number;
  total: number;
  compressing: boolean;
}) {
  const label =
    compressing && uploaded === 0
      ? "Görseller hazırlanıyor…"
      : total > 0
        ? `Medya yükleniyor... (${uploaded} / ${total})`
        : "Medya yükleniyor...";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      <Spinner size="lg" />
      <p className="mt-5 max-w-xs px-6 text-center text-base font-semibold text-white">
        {label}
      </p>
    </div>
  );
}

function UploadSuccessBanner({ count }: { count?: number }) {
  return (
    <div
      className="fixed left-4 right-4 top-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-emerald-900 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-200"
      role="status"
      aria-live="polite"
    >
      <span className="text-xl" aria-hidden>
        ✅
      </span>
      <div>
        <p className="text-sm font-bold">Başarıyla Yüklendi</p>
        {count != null && count > 0 && (
          <p className="text-xs font-medium text-emerald-800">
            {count} fotoğraf Google Drive&apos;a aktarıldı
          </p>
        )}
      </div>
    </div>
  );
}

function BusinessPicker({
  connection,
  searchQuery,
  onSearchChange,
  loadingBusinesses,
  businessesError,
  onRetryBusinesses,
  onRefreshBusinesses,
  filteredBusinesses,
  onSelectBusiness,
  onOpenAddModal,
  onOpenUpdatesModal,
}: {
  connection: Extract<ConnectionState, { status: "connected" }>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  loadingBusinesses: boolean;
  businessesError: string | null;
  onRetryBusinesses: () => void;
  onRefreshBusinesses: () => void;
  filteredBusinesses: Business[];
  onSelectBusiness: (b: Business) => void;
  onOpenAddModal: () => void;
  onOpenUpdatesModal: () => void;
}) {
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "new">("az");

  const sortedBusinesses = [...filteredBusinesses].sort((a, b) => {
    if (sortOrder === "az") return a.name.localeCompare(b.name);
    if (sortOrder === "za") return b.name.localeCompare(a.name);
    return 0;
  });

  return (
    <div className="surface-card p-5">
      <div className="mb-4 border-b border-slate-100 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">İşletme seçimi</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Yükleme yapılacak işletmeyi seçin
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Bağlı
            </span>
            <button
              type="button"
              onClick={onOpenUpdatesModal}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-200 transition-colors hover:bg-blue-100"
            >
              ✨ Yenilikler
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-xs text-slate-500">
            {connection.rootFolderName}
          </p>
          <button
            type="button"
            onClick={() => void onRefreshBusinesses()}
            disabled={loadingBusinesses}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Listeyi yenile
          </button>
        </div>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="İşletme ara..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-800 focus:bg-white focus:ring-2 focus:ring-blue-800/15"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Sırala:</span>
        <button
          type="button"
          onClick={() => setSortOrder("az")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            sortOrder === "az"
              ? "bg-blue-800 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          A → Z
        </button>
        <button
          type="button"
          onClick={() => setSortOrder("za")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            sortOrder === "za"
              ? "bg-blue-800 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Z → A
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenAddModal}
        className="btn-secondary mt-4 text-base"
      >
        <FolderPlusIcon className="h-5 w-5" />
        Yeni İşletme Ekle
      </button>

      {businessesError ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center">
          <p className="text-sm font-medium text-red-700">{businessesError}</p>
          {(businessesError.toLowerCase().includes("yetkisiz") ||
            businessesError.toLowerCase().includes("unauthorized")) && (
            <p className="mt-2">
              <Link
                href="/unlock"
                className="text-sm font-semibold text-blue-800 underline"
              >
                Uygulama kilidini aç →
              </Link>
            </p>
          )}
          <button
            type="button"
            onClick={onRetryBusinesses}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Tekrar dene
          </button>
        </div>
      ) : loadingBusinesses ? (
        <div className="mt-4 flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50">
          {filteredBusinesses.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-900">
                {searchQuery ? "Sonuç bulunamadı" : "Henüz işletme yok"}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {searchQuery
                  ? "Farklı bir arama deneyin"
                  : "Yukarıdan yeni işletme ekleyebilirsiniz"}
              </p>
            </div>
          ) : (
            <ul className="scroll-panel divide-y divide-slate-100 bg-white">
              {sortedBusinesses.map((business) => (
                <li key={business.id} className="flex items-center justify-between group/li hover:bg-blue-50/60">
                  <button
                    type="button"
                    onClick={() => onSelectBusiness(business)}
                    className="group flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-4 text-left transition-all active:scale-[0.995]"
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-800 group-hover:text-blue-900">
                      {business.name}
                    </span>
                    <ChevronIcon className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-blue-700" />
                  </button>
                  <div className="pr-4 flex items-center shrink-0">
                    <DeleteItemButton
                      itemId={business.id}
                      itemName={business.name}
                      itemKind="işletme"
                      onDeleted={onRefreshBusinesses}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

    </div>
  );
}

function AddBusinessModal({
  open,
  name,
  creating,
  error,
  onNameChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  name: string;
  creating: boolean;
  error: string | null;
  onNameChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !creating) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, creating, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-business-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        disabled={creating}
        aria-label="Kapat"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2
          id="add-business-title"
          className="mb-1 text-xl font-semibold text-slate-900"
        >
          Yeni İşletme
        </h2>
        <p className="mb-5 text-sm text-slate-600">
          Drive&apos;da yeni bir klasör oluşturulacak
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="business-name"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              İşletme Adı
            </label>
            <input
              ref={inputRef}
              id="business-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="örn. Öncel Eczanesi"
              disabled={creating}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-100 disabled:opacity-60"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="btn-primary flex-1"
            >
              {creating ? (
                <>
                  <Spinner size="sm" />
                  Oluşturuluyor...
                </>
              ) : (
                "Oluştur"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Spinner({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg"
      ? "h-12 w-12 border-4"
      : size === "sm"
        ? "h-5 w-5 border-2"
        : "h-8 w-8 border-[3px]";
  return (
    <div
      className={`${dim} animate-spin rounded-full border-blue-700 border-t-transparent`}
      role="status"
      aria-label="Yükleniyor"
    />
  );
}

function SearchIcon({ className }: { className?: string }) {
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

function ChevronIcon({ className = "h-5 w-5 text-slate-400" }: { className?: string }) {
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

function FolderPlusIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"
      />
    </svg>
  );
}

function UpdatesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const UPDATES = [
    {
      badge: "Yeni",
      title: "Tek Ekran Entegrasyonu",
      description: "Sekmeler tamamen kaldırıldı. İşletme seçildiğinde gezgin ve yükleme paneli tek bir akışta bir arada sunulur.",
      date: "Haziran 2026",
      icon: "⚡",
    },
    {
      badge: "Yeni",
      title: "İşletme Silme Yeteneği",
      description: "Drive üzerindeki işletme klasörlerini ve içlerindeki tüm verileri doğrudan ana ekrandan silebilirsiniz.",
      date: "Haziran 2026",
      icon: "🗑️",
    },
    {
      badge: "İyileştirme",
      title: "Akıllı Dizin Navigasyonu",
      description: "Gezinti yığıtı durum yönetiminin iyileştirilmesiyle klasör geçişleri çok daha hızlı ve hatasız hale getirildi.",
      date: "Haziran 2026",
      icon: "📂",
    },
  ];

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="updates-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-md"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-900/10">
        <div className="bg-gradient-to-br from-blue-800 to-indigo-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-blue-500/30 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-blue-200">
              Versiyon Güncellemesi
            </span>
            <span className="text-xs text-blue-200 font-medium">v1.2.0</span>
          </div>
          <h2
            id="updates-modal-title"
            className="mt-2 text-xl font-bold leading-tight sm:text-2xl"
          >
            Yenilikler & Güncellemeler
          </h2>
          <p className="mt-1 text-sm text-blue-100">
            Saha operasyonlarınızı kolaylaştıracak son değişiklikler.
          </p>
        </div>

        <div className="max-h-[24rem] overflow-y-auto px-5 py-5 space-y-5 scroll-panel">
          {UPDATES.map((up) => (
            <div key={up.title} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg ring-1 ring-blue-100" aria-hidden>
                {up.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{up.title}</h3>
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    up.badge === "Yeni" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10" : "bg-blue-50 text-blue-700 ring-1 ring-blue-600/10"
                  }`}>
                    {up.badge}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{up.date}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {up.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary w-full py-3.5 text-base font-semibold"
          >
            Harika, Devam Et
          </button>
        </div>
      </div>
    </div>
  );
}

