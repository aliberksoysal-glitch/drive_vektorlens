import { NextRequest, NextResponse } from "next/server";
import { getOrCreateVisitFolder } from "@/lib/googleDrive";
import { apiError, handleDriveRouteError } from "@/lib/drive/errors";

export const dynamic = "force-dynamic";

/**
 * İşletme klasörü altında bugünün tarihli ziyaret klasörünü bulur veya oluşturur.
 * Body: { "businessFolderId": "...", "businessName": "Öncel Eczanesi" }
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

    if (!businessFolderId) {
      return apiError("businessFolderId gerekli.", 400, "MISSING_FOLDER_ID");
    }
    if (!businessName) {
      return apiError("businessName gerekli.", 400, "MISSING_NAME");
    }

    const { folder, created } = await getOrCreateVisitFolder(
      businessFolderId,
      businessName,
    );

    return NextResponse.json({
      ok: true,
      folder,
      created,
      message: created
        ? "Ziyaret klasörü oluşturuldu."
        : "Bugünkü ziyaret klasörü zaten mevcut.",
    });
  } catch (error) {
    return handleDriveRouteError(error);
  }
}
