"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Business = { id: string; name: string };

type ConnectionState =
  | { status: "loading" }
  | { status: "connected"; rootFolderName: string; email: string }
  | { status: "error"; message: string };

type PendingPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; current: number; total: number }
  | { status: "success"; count: number }
  | { status: "error"; message: string };

const MAX_PHOTOS = 30;

export function DriveApp() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [connection, setConnection] = useState<ConnectionState>({
    status: "loading",
  });
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [selectedPhotos, setSelectedPhotos] = useState<PendingPhoto[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });

  const loadBusinesses = useCallback(async () => {
    setLoadingBusinesses(true);
    try {
      const res = await fetch("/api/drive/businesses");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "İşletmeler yüklenemedi.");
      }
      setBusinesses(data.businesses ?? []);
      setFilteredBusinesses(data.businesses ?? []);
    } catch (err) {
      setConnection({
        status: "error",
        message:
          err instanceof Error ? err.message : "İşletmeler yüklenemedi.",
      });
    } finally {
      setLoadingBusinesses(false);
    }
  }, []);

  useEffect(() => {
    async function connect() {
      try {
        const res = await fetch("/api/drive/health");
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? "Drive bağlantısı kurulamadı.");
        }
        setConnection({
          status: "connected",
          rootFolderName: data.rootFolder?.name ?? "İşletmeler",
          email: data.accountEmail ?? "",
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
    }
    connect();
  }, [loadBusinesses]);

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

  const photosRef = useRef(selectedPhotos);
  photosRef.current = selectedPhotos;
  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  function revokePhotos(photos: PendingPhoto[]) {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  }

  function resetPhotoState() {
    setSelectedPhotos((prev) => {
      revokePhotos(prev);
      return [];
    });
    setUploadState({ status: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function addPhotosFromFileList(files: FileList | null) {
    if (!files?.length) return;

    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (!imageFiles.length) return;

    setSelectedPhotos((prev) => {
      const remaining = MAX_PHOTOS - prev.length;
      if (remaining <= 0) {
        alert(`En fazla ${MAX_PHOTOS} fotoğraf seçebilirsiniz.`);
        return prev;
      }

      const toAdd = imageFiles.slice(0, remaining).map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      if (imageFiles.length > remaining) {
        alert(
          `En fazla ${MAX_PHOTOS} fotoğraf. ${remaining} fotoğraf eklendi.`,
        );
      }

      return [...prev, ...toAdd];
    });
    setUploadState({ status: "idle" });
  }

  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    addPhotosFromFileList(e.target.files);
    e.target.value = "";
  }

  function removePhoto(id: string) {
    setSelectedPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
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
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Klasör oluşturulamadı.");
      }
      setIsAddModalOpen(false);
      setNewBusinessName("");
      setSelectedBusiness(data.folder);
      setSearchQuery("");
      resetPhotoState();
      await loadBusinesses();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Klasör oluşturulamadı.",
      );
    } finally {
      setCreatingFolder(false);
    }
  }

  async function uploadSinglePhoto(file: File, folderId: string) {
    const formData = new FormData();
    formData.append("folderId", folderId);
    formData.append("file", file, file.name);

    const res = await fetch("/api/drive/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? `${file.name} yüklenemedi.`);
    }
  }

  async function handleUploadToDrive() {
    if (!selectedPhotos.length || !selectedBusiness) return;

    const total = selectedPhotos.length;
    setUploadState({ status: "uploading", current: 0, total });

    let uploaded = 0;
    const failed: string[] = [];

    for (let i = 0; i < selectedPhotos.length; i++) {
      const photo = selectedPhotos[i];
      setUploadState({ status: "uploading", current: i + 1, total });

      try {
        await uploadSinglePhoto(photo.file, selectedBusiness.id);
        uploaded++;
      } catch (err) {
        failed.push(
          err instanceof Error ? err.message : photo.file.name,
        );
      }
    }

    if (uploaded === total) {
      setUploadState({ status: "success", count: uploaded });
      setTimeout(() => resetPhotoState(), 2000);
    } else if (uploaded > 0) {
      setUploadState({
        status: "error",
        message: `${uploaded}/${total} yüklendi. Hatalar: ${failed.join("; ")}`,
      });
    } else {
      setUploadState({
        status: "error",
        message: failed[0] ?? "Yükleme başarısız.",
      });
    }
  }

  if (connection.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-6 py-16 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <Spinner />
        <p className="mt-4 text-base font-medium text-blue-900">
          Google Drive&apos;a bağlanılıyor
        </p>
        <p className="mt-1 text-sm text-slate-600">Lütfen bekleyin…</p>
      </div>
    );
  }

  if (connection.status === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <p className="mb-2 text-lg font-semibold text-red-600">Bağlantı hatası</p>
        <p className="text-sm text-slate-600">{connection.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!selectedBusiness ? (
        <>
          <BusinessPicker
            connection={connection}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loadingBusinesses={loadingBusinesses}
            filteredBusinesses={filteredBusinesses}
            onSelectBusiness={(b) => {
              setSelectedBusiness(b);
              resetPhotoState();
            }}
            onOpenAddModal={openAddBusinessModal}
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
          <SelectedBusinessBanner
            business={selectedBusiness}
            onChange={() => {
              setSelectedBusiness(null);
              resetPhotoState();
            }}
          />

          <PhotoCaptureSection
            fileInputRef={fileInputRef}
            cameraInputRef={cameraInputRef}
            photos={selectedPhotos}
            uploadState={uploadState}
            onCapture={handlePhotoCapture}
            onSelectMultiple={() => fileInputRef.current?.click()}
            onTakePhoto={() => cameraInputRef.current?.click()}
            onUpload={handleUploadToDrive}
            onClearAll={resetPhotoState}
            onRemovePhoto={removePhoto}
            onAddMore={() => fileInputRef.current?.click()}
          />
        </>
      )}
    </div>
  );
}

function BusinessPicker({
  connection,
  searchQuery,
  onSearchChange,
  loadingBusinesses,
  filteredBusinesses,
  onSelectBusiness,
  onOpenAddModal,
}: {
  connection: Extract<ConnectionState, { status: "connected" }>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  loadingBusinesses: boolean;
  filteredBusinesses: Business[];
  onSelectBusiness: (b: Business) => void;
  onOpenAddModal: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <div className="mb-4 border-b border-slate-100 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">İşletme seçimi</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Yükleme yapılacak işletmeyi seçin
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Bağlı
          </span>
        </div>
        <p className="mt-2 truncate text-xs text-slate-500">
          {connection.rootFolderName}
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="İşletme ara..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-700/15"
        />
      </div>

      <button
        type="button"
        onClick={onOpenAddModal}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-5 py-3.5 text-base font-semibold text-blue-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-blue-300 hover:bg-blue-50 active:scale-[0.99]"
      >
        <FolderPlusIcon className="h-5 w-5" />
        Yeni İşletme Ekle
      </button>

      {loadingBusinesses ? (
        <div className="mt-4 flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50">
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
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {filteredBusinesses.map((business) => (
                <li key={business.id}>
                  <button
                    type="button"
                    onClick={() => onSelectBusiness(business)}
                    className="group flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-all hover:bg-white active:scale-[0.995]"
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-800 group-hover:text-blue-900">
                      {business.name}
                    </span>
                    <ChevronIcon className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-blue-700" />
                  </button>
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
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-800 active:scale-[0.98] disabled:opacity-50"
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

function SelectedBusinessBanner({
  business,
  onChange,
}: {
  business: Business;
  onChange: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] ring-1 ring-blue-100">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
            Seçilen işletme
          </p>
          <p className="truncate text-lg font-semibold text-slate-900">
            {business.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onChange}
          className="shrink-0 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-900 transition-all hover:bg-blue-50 active:scale-[0.98]"
        >
          Değiştir
        </button>
      </div>
    </div>
  );
}

function PhotoCaptureSection({
  fileInputRef,
  cameraInputRef,
  photos,
  uploadState,
  onCapture,
  onSelectMultiple,
  onTakePhoto,
  onUpload,
  onClearAll,
  onRemovePhoto,
  onAddMore,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  photos: PendingPhoto[];
  uploadState: UploadState;
  onCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectMultiple: () => void;
  onTakePhoto: () => void;
  onUpload: () => void;
  onClearAll: () => void;
  onRemovePhoto: (id: string) => void;
  onAddMore: () => void;
}) {
  const isUploading = uploadState.status === "uploading";
  const isSuccess = uploadState.status === "success";
  const isError = uploadState.status === "error";
  const hasPhotos = photos.length > 0;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <div className="mb-4 border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-blue-900">Fotoğraf yükleme</h2>
        <p className="mt-0.5 text-sm text-slate-600">
          Saha kayıtlarını Drive&apos;a aktarın
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onCapture}
        className="sr-only"
        aria-hidden
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onCapture}
        className="sr-only"
        aria-hidden
      />

      {!hasPhotos ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={onSelectMultiple}
            disabled={isUploading}
            className="group flex w-full flex-col items-center justify-center gap-4 rounded-[1.75rem] bg-blue-700 px-6 py-11 text-white shadow-lg shadow-blue-900/20 ring-1 ring-blue-600/30 transition-all hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-900/25 active:scale-[0.97] active:shadow-inner disabled:opacity-50"
          >
            <span className="flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-full bg-white/15 ring-[3px] ring-white/25 transition-transform group-active:scale-95">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-900/40 ring-2 ring-cyan-300/40">
                <CameraIcon className="h-9 w-9" />
              </span>
            </span>
            <span className="text-2xl font-bold tracking-tight">
              Dosya Seç
            </span>
            <span className="text-center text-sm font-medium text-blue-100/90">
              Galeriden toplu seçim yapabilirsiniz
            </span>
          </button>
          <button
            type="button"
            onClick={onTakePhoto}
            disabled={isUploading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white py-4 text-sm font-semibold text-blue-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-blue-300 hover:bg-blue-50 active:scale-[0.98] disabled:opacity-50"
          >
            <CameraIcon className="h-5 w-5 text-blue-700" />
            Fotoğraf Çek
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">
              <span className="font-semibold text-blue-700">{photos.length}</span>{" "}
              fotoğraf seçildi
            </p>
            {!isUploading && !isSuccess && (
              <button
                type="button"
                onClick={onAddMore}
                className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900"
              >
                + Daha ekle
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
              >
                <img
                  src={photo.previewUrl}
                  alt={photo.file.name}
                  className="h-full w-full object-cover"
                />
                {!isUploading && !isSuccess && (
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(photo.id)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs text-slate-600 shadow-sm transition-colors hover:bg-red-500 hover:text-white"
                    aria-label="Kaldır"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {isUploading && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 py-6">
              <Spinner />
              <p className="text-base font-semibold text-slate-700">
                Yükleniyor... ({uploadState.current}/{uploadState.total})
              </p>
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-700 ring-1 ring-emerald-200">
              <CheckIcon />
              <span className="font-semibold">
                {uploadState.count} fotoğraf başarıyla yüklendi
              </span>
            </div>
          )}

          {isError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-600 ring-1 ring-red-200">
              {uploadState.message}
            </p>
          )}

          {!isUploading && !isSuccess && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onUpload}
                className="w-full rounded-2xl bg-blue-700 py-4 text-lg font-bold text-white shadow-md shadow-blue-900/15 transition-all hover:bg-blue-800 active:scale-[0.97] active:shadow-inner"
              >
                {photos.length === 1
                  ? "Drive'a Yükle"
                  : `${photos.length} Fotoğrafı Drive'a Yükle`}
              </button>
              <button
                type="button"
                onClick={onClearAll}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Tümünü temizle
              </button>
            </div>
          )}
        </div>
      )}
    </section>
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

function CheckIcon() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CameraIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}
