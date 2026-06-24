import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { createHash } from "crypto";
import {
  assertUploadFolderId,
  DriveConfigError,
  ensureDriveAuth,
  getAuthenticatedUserEmail,
  getDriveClient,
} from "@/lib/googleDrive";
import { handleDriveRouteError } from "@/lib/drive/errors";
import {
  inferUploadMime,
  isAllowedUploadMime,
  maxUploadBytesForMime,
} from "@/lib/mediaTypes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/** İstemci medyayı sırayla tek tek yükler; bu rota istek başına tek dosya alır. */

function sanitizeFileName(name: string): string {
  const s = name
    .replace(/[<>:"|?*]/g, "_")
    .replace(/\//g, "_")
    .replace(/\\/g, "_")
    .replace(/\0/g, "")
    .trim()
    .slice(0, 200);
  return s || `photo-${Date.now()}.jpg`;
}

function computeMd5(buffer: Buffer): string {
  return createHash("md5").update(buffer).digest("base64");
}

function logUploadError(label: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[UPLOAD] ${label}`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  } else {
    console.error(`[UPLOAD] ${label}`, error);
  }

  if (error && typeof error === "object" && "response" in error) {
    const apiError = error as {
      response?: { status?: number; statusText?: string; data?: unknown };
    };
    console.error(`[UPLOAD] ${label} — Drive API:`, apiError.response?.data);
  }
}

export async function POST(req: NextRequest) {
  let step = "başlangıç";

  try {
    step = "oauth doğrulama";
    await ensureDriveAuth();
    const accountEmail = await getAuthenticatedUserEmail();

    step = "formData okuma";
    const formData = await req.formData();
    const businessFolderId = formData.get("folderId")?.toString().trim();
    const file = formData.get("file") as File | null;

    if (!businessFolderId) {
      return NextResponse.json(
        { success: false, ok: false, error: "folderId alanı gerekli." },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, ok: false, error: "file alanı gerekli." },
        { status: 400 },
      );
    }

    const uploadFile = file instanceof File ? file : new File([file], "photo.jpg");

    const mimeType = inferUploadMime(
      uploadFile.name || "",
      uploadFile.type,
    );
    const maxBytes = maxUploadBytesForMime(mimeType);

    if (maxBytes != null && uploadFile.size > maxBytes) {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: `Dosya boyutu limiti aşıldı (maks. ${maxBytes / 1024 / 1024} MB).`,
        },
        { status: 413 },
      );
    }

    if (!isAllowedUploadMime(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error:
            "Geçersiz dosya türü. Görsel (JPEG, PNG, WebP, HEIC) veya video (MP4, MOV, AVI) kabul edilir.",
        },
        { status: 415 },
      );
    }

    step = "hedef klasör doğrulama";
    await assertUploadFolderId(businessFolderId);

    step = "dosya buffer hazırlama";
    const bytes = await uploadFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = sanitizeFileName(uploadFile.name || `saha-${Date.now()}.jpg`);
    const localMd5 = computeMd5(buffer);

    const drive = getDriveClient();

    step = "drive.files.create";
    console.log("[UPLOAD] başlıyor:", {
      accountEmail,
      fileName,
      size: uploadFile.size,
      parents: [businessFolderId],
    });

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [businessFolderId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: "id, name, size, md5Checksum",
      supportsAllDrives: true,
    });

    const fileId = response.data.id;
    const driveMd5 = response.data.md5Checksum;
    const reportedSizeRaw = response.data.size;
    const reportedSize =
      reportedSizeRaw === undefined || reportedSizeRaw === null
        ? null
        : Number(reportedSizeRaw);

    if (!fileId) {
      throw new Error("Drive dosya ID döndürmedi.");
    }

    /** Drive bazı türlerde (ör. HEIC) içeriği dönüştürebilir; MD5 farklı olsa da dosya geçerli olabilir. */
    const checksumMatch =
      !driveMd5 || driveMd5 === localMd5;
    const sizeMatch =
      reportedSize === null ||
      Number.isNaN(reportedSize) ||
      reportedSize === buffer.length;

    if (!sizeMatch) {
      try {
        await drive.files.delete({ fileId, supportsAllDrives: true });
      } catch {
        console.error("[UPLOAD] temizleme başarısız:", fileId);
      }
      throw new Error(
        `Dosya boyutu uyuşmazlığı (beklenen ${buffer.length} bayt, Drive ${reportedSize}). Yükleme geri alındı.`,
      );
    }

    if (!checksumMatch) {
      console.warn("[UPLOAD] MD5 farklı; boyut uyumlu, dosya korunuyor:", {
        fileId,
        mimeType,
        localMd5,
        driveMd5,
        size: buffer.length,
      });
    }

    const verified = checksumMatch && !!driveMd5;

    console.log("[UPLOAD] tamamlandı:", { fileId, accountEmail, verified });

    console.log(
      JSON.stringify({
        level: "info",
        event: "drive.upload.complete",
        fileId,
        fileName,
        folderId: businessFolderId,
        size: uploadFile.size,
        accountEmail,
        verified,
        ts: new Date().toISOString(),
      }),
    );

    const webhook = process.env.ACTIVITY_WEBHOOK_URL?.trim();
    if (webhook) {
      const payload = {
        event: "drive.upload",
        fileId,
        fileName,
        folderId: businessFolderId,
        mimeType,
        size: uploadFile.size,
        accountEmail,
        verified,
        ts: new Date().toISOString(),
      };
      void fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {
        console.warn("[UPLOAD] webhook gönderilemedi");
      });
    }

    return NextResponse.json({
      success: true,
      ok: true,
      fileId,
      name: response.data.name ?? fileName,
      size: response.data.size,
      md5Checksum: driveMd5 ?? localMd5,
      verified,
      parents: response.data.parents ?? [businessFolderId],
      accountEmail,
      message: checksumMatch
        ? "Yükleme başarılı."
        : "Yükleme tamamlandı (Drive tarafında içerik dönüşümü olmuş olabilir; MD5 doğrulanamadı).",
    });
  } catch (error) {
    logUploadError(`Hata (adım: ${step})`, error);

    if (error instanceof DriveConfigError) {
      return NextResponse.json(
        { success: false, ok: false, error: error.message, step },
        { status: 400 },
      );
    }

    const driveResponse = handleDriveRouteError(error);
    const body = await driveResponse.json();
    return NextResponse.json(
      { success: false, ...body, step },
      { status: driveResponse.status },
    );
  }
}
