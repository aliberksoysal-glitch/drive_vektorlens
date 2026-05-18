/** Sunucu: sıkıştırılmış görseller için üst sınır (videolarda sunucu tarafı boyut sınırı yok) */
export const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024;

export const IMAGE_MIME_REGEX =
  /^image\/(jpeg|png|webp|heic|heif|gif|bmp)$/i;

export const VIDEO_MIME_REGEX =
  /^video\/(mp4|quicktime|x-msvideo|webm|3gpp|3gpp2)$/i;

const VIDEO_EXT_REGEX = /\.(mp4|mov|avi|webm|m4v|3gp|3g2)$/i;

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file.name);
}

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return VIDEO_EXT_REGEX.test(file.name);
}

export function isUploadableMediaFile(file: File): boolean {
  return isImageFile(file) || isVideoFile(file);
}

export function isAllowedUploadMime(mimeType: string): boolean {
  return IMAGE_MIME_REGEX.test(mimeType) || VIDEO_MIME_REGEX.test(mimeType);
}

/** Video için `null` — boyut kontrolü yapılmaz. */
export function maxUploadBytesForMime(mimeType: string): number | null {
  return mimeType.startsWith("video/") ? null : MAX_IMAGE_UPLOAD_BYTES;
}

/** Bazı mobil tarayıcılar video için boş MIME gönderir; uzantıdan çıkarım yapılır. */
export function inferUploadMime(fileName: string, fileType?: string): string {
  const trimmed = fileType?.trim();
  if (trimmed) return trimmed;

  const lower = fileName.toLowerCase();
  if (/\.(mp4|m4v)$/.test(lower)) return "video/mp4";
  if (/\.mov$/.test(lower)) return "video/quicktime";
  if (/\.avi$/.test(lower)) return "video/x-msvideo";
  if (/\.webm$/.test(lower)) return "video/webm";
  if (/\.3gp$/.test(lower)) return "video/3gpp";
  if (/\.(jpe?g)$/.test(lower)) return "image/jpeg";
  if (/\.png$/.test(lower)) return "image/png";
  if (/\.webp$/.test(lower)) return "image/webp";
  if (/\.(heic|heif)$/.test(lower)) return "image/heic";

  return "image/jpeg";
}
