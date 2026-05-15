import { NextRequest, NextResponse } from "next/server";
import { getOrCreateBusinessFolder } from "@/lib/googleDrive";
import { apiError, handleDriveRouteError } from "@/lib/drive/errors";

export const dynamic = "force-dynamic";

/**
 * Yeni işletme klasörü oluşturur (GOOGLE_DRIVE_FOLDER_ID altında).
 * Body: { "name": "Öncel Eczanesi" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return apiError("İşletme adı gerekli.", 400, "MISSING_NAME");
    }

    const { folder, created } = await getOrCreateBusinessFolder(name);

    return NextResponse.json({
      ok: true,
      folder,
      created,
      message: created
        ? "İşletme klasörü oluşturuldu."
        : "Bu isimde klasör zaten mevcut.",
    });
  } catch (error) {
    return handleDriveRouteError(error);
  }
}
