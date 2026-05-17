import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import {
  assertUploadFolderId,
  DriveConfigError,
  ensureDriveAuth,
  getAuthenticatedUserEmail,
  getDriveClient,
} from "@/lib/googleDrive";
import { handleDriveRouteError } from "@/lib/drive/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

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

    if (uploadFile.size > MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: `Dosya boyutu limiti aşıldı (maks. ${MAX_BYTES / 1024 / 1024} MB).`,
        },
        { status: 413 },
      );
    }

    step = "hedef klasör doğrulama";
    await assertUploadFolderId(businessFolderId);

    step = "dosya buffer hazırlama";
    const bytes = await uploadFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = uploadFile.name || `saha-${Date.now()}.jpg`;
    const mimeType = uploadFile.type || "image/jpeg";

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
      fields: "id, name, size, parents",
      supportsAllDrives: true,
    });

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error("Drive dosya ID döndürmedi.");
    }

    console.log("[UPLOAD] tamamlandı:", { fileId, accountEmail });

    return NextResponse.json({
      success: true,
      ok: true,
      fileId,
      name: response.data.name ?? fileName,
      size: response.data.size,
      parents: response.data.parents ?? [businessFolderId],
      accountEmail,
      message: "Yükleme başarılı.",
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
