import { isUploadableMediaFile } from "@/lib/mediaTypes";

export function mediaFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/** Yinelenen dosyaları atlayarak listeleri birleştirir. */
export function mergeMediaFileLists(existing: File[], incoming: File[]): File[] {
  const seen = new Set(existing.map(mediaFileKey));
  const merged = [...existing];
  for (const file of incoming) {
    if (!isUploadableMediaFile(file)) continue;
    const key = mediaFileKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(file);
  }
  return merged;
}
