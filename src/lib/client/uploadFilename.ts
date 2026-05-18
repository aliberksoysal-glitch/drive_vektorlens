const SAFE_SEGMENT = /[^\w\-.\u00C0-\u024F\u0400-\u04FF]+/g;

export function sanitizeFilenameSegment(input: string, max = 56): string {
  const t = input
    .trim()
    .replace(SAFE_SEGMENT, "_")
    .replace(/_+/g, "_")
    .slice(0, max);
  return t || "x";
}

/** NEXT_PUBLIC_UPLOAD_FILENAME_TEMPLATE ile derleme zamanında gömülür. */
export function getUploadFilenameTemplate(): string {
  const raw =
    typeof process !== "undefined" &&
    typeof process.env?.NEXT_PUBLIC_UPLOAD_FILENAME_TEMPLATE === "string"
      ? process.env.NEXT_PUBLIC_UPLOAD_FILENAME_TEMPLATE.trim()
      : "";
  return raw || "{business}-{visit}-{index}.{ext}";
}

export function extensionFromFileName(name: string): string {
  const m = name.match(/\.([^.]+)$/);
  const ext = (m?.[1] || "jpg").toLowerCase().replace(/[^a-z0-9]/gi, "");
  return ext || "jpg";
}

/**
 * Örn. şablon: `{business}-{visit}-{index}-{date}.{ext}`
 * Yer tutucular: business, visit, index, ext, yyyy, mm, dd, date (yyyy-mm-dd), time (HHmmss)
 */
export function buildPhotoUploadFileName(
  template: string,
  vars: {
    business: string;
    visit: string;
    index: number;
    originalName: string;
    now?: Date;
  },
): string {
  const now = vars.now ?? new Date();
  const ext = extensionFromFileName(vars.originalName);

  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  let out = template
    .replace(/\{business\}/gi, sanitizeFilenameSegment(vars.business))
    .replace(/\{visit\}/gi, sanitizeFilenameSegment(vars.visit))
    .replace(/\{index\}/gi, String(vars.index))
    .replace(/\{ext\}/gi, ext)
    .replace(/\{yyyy\}/g, yyyy)
    .replace(/\{mm\}/g, mm)
    .replace(/\{dd\}/g, dd)
    .replace(/\{date\}/g, `${yyyy}-${mm}-${dd}`)
    .replace(/\{time\}/g, `${hh}${min}${ss}`);

  out = out
    .replace(/[<>:"|?*\\/]/g, "_")
    .replace(/\0/g, "")
    .trim()
    .slice(0, 200);

  const lower = out.toLowerCase();
  if (!lower.endsWith(`.${ext}`)) {
    out = `${out}.${ext}`;
  }

  return out || `photo-${Date.now()}.${ext}`;
}
