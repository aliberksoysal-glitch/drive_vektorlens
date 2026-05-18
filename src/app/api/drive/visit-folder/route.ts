import { NextRequest, NextResponse } from "next/server";
import { parseVisitDateInput } from "@/lib/drive/folderNaming";
import {
  getOrCreateChildFolder,
  getOrCreateVisitFolder,
} from "@/lib/googleDrive";
import { apiError, handleDriveRouteError } from "@/lib/drive/errors";

export const dynamic = "force-dynamic";

/**
 * İşletme klasörü altında seçilen tarihli ziyaret klasörünü bulur veya oluşturur.
 * Body: { businessFolderId, businessName, visitDate?: "YYYY-MM-DD" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const businessFolderId =
      typeof body.businessFolderId === "string"
        ? body.businessFolderId.trim()
        : "";
    const businessName =
      typeof body.businessName === "string" ? body.businessName.trim() : "";
    const subfolderName =
      typeof body.subfolderName === "string" ? body.subfolderName.trim() : "";
    const visitDateRaw =
      typeof body.visitDate === "string" ? body.visitDate.trim() : "";
    const visitDate = visitDateRaw
      ? (parseVisitDateInput(visitDateRaw) ?? undefined)
      : undefined;
    if (visitDateRaw && !visitDate) {
      return apiError(
        "visitDate geçersiz. YYYY-MM-DD formatında olmalı.",
        400,
        "INVALID_VISIT_DATE",
      );
    }

    if (!businessFolderId) {
      return apiError("businessFolderId gerekli.", 400, "MISSING_FOLDER_ID");
    }
    if (!businessName) {
      return apiError("businessName gerekli.", 400, "MISSING_NAME");
    }

    const { folder: visitFolder, created } = await getOrCreateVisitFolder(
      businessFolderId,
      businessName,
      visitDate,
    );

    let target = visitFolder;
    let subfolder: typeof visitFolder | undefined;
    let subCreated = false;

    if (subfolderName) {
      const sub = await getOrCreateChildFolder(visitFolder.id, subfolderName);
      target = sub.folder;
      subfolder = sub.folder;
      subCreated = sub.created;
    }

    return NextResponse.json({
      ok: true,
      folder: target,
      visitFolder,
      subfolder,
      created,
      subCreated,
      message: subfolderName
        ? subCreated
          ? "Alt klasör oluşturuldu."
          : "Alt klasör hazır."
        : created
          ? "Ziyaret klasörü oluşturuldu."
          : "Seçilen tarihli ziyaret klasörü zaten mevcut.",
    });
  } catch (error) {
    return handleDriveRouteError(error);
  }
}
