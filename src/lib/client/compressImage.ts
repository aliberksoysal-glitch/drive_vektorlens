/** Sunucu yükleme limitine uygun JPEG sıkıştırma (canvas). HEIC vb. desteklenmezse orijinal döner. */

const TARGET_MAX_BYTES = 3.75 * 1024 * 1024;
const MAX_EDGE_PX = 2400;
const INITIAL_QUALITY = 0.92;

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

/** Büyük görselleri yeniden boyutlandırıp JPEG'e çevirir; hedef boyutun altına inene kadar kalite düşürülür. */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
  } catch {
    return file;
  }

  try {
    let { width, height } = bitmap;
    const scale =
      width > MAX_EDGE_PX || height > MAX_EDGE_PX
        ? Math.min(MAX_EDGE_PX / width, MAX_EDGE_PX / height)
        : 1;
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = INITIAL_QUALITY;
    let blob: Blob | null = await canvasToBlob(
      canvas,
      "image/jpeg",
      quality,
    );

    while (blob && blob.size > TARGET_MAX_BYTES && quality > 0.45) {
      quality -= 0.07;
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }

    if (!blob || blob.size >= file.size) {
      if (file.size <= TARGET_MAX_BYTES) {
        bitmap.close();
        return file;
      }
    }

    if (!blob) {
      bitmap.close();
      return file;
    }

    const base =
      file.name.replace(/\.[^.]+$/, "") ||
      `photo-${Date.now()}`;
    const outName = `${base}.jpg`;
    bitmap.close();
    return new File([blob], outName, { type: "image/jpeg" });
  } catch {
    bitmap.close();
    return file;
  }
}
