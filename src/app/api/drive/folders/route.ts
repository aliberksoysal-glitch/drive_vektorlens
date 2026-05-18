import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateBusinessFolder,
  getOrCreateChildFolder,
  getOrCreateVisitFolder,
  listChildFolders,
} from "@/lib/googleDrive";
import { apiError, handleDriveRouteError } from "@/lib/drive/errors";

export const dynamic = "force-dynamic";

/**
 * Alt klasörleri listeler (canlı ortak havuz).
 * Query: ?parentFolderId=...
 */
export async function GET(request: NextRequest) {
  try {
    const parentFolderId =
      request.nextUrl.searchParams.get("parentFolderId")?.trim() ?? "";

    if (!parentFolderId) {
      return apiError("parentFolderId gerekli.", 400, "MISSING_PARENT_ID");
    }

    const folders = await listChildFolders(parentFolderId);

    return NextResponse.json({
      ok: true,
      folders,
    });
  } catch (error) {
    return handleDriveRouteError(error);
  }
}

/**
 * POST body:
 * - { "name": "Öncel Eczanesi" } → yeni işletme (+ bugünkü ziyaret klasörü)
 * - { "parentFolderId": "...", "name": "Pano" } → alt klasör oluştur / bul
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const parentFolderId =
      typeof body.parentFolderId === "string"
        ? body.parentFolderId.trim()
        : "";

    if (!name) {
      return apiError("Klasör adı gerekli.", 400, "MISSING_NAME");
    }

    if (parentFolderId) {
      const { folder, created } = await getOrCreateChildFolder(
        parentFolderId,
        name,
      );
      return NextResponse.json({
        ok: true,
        folder,
        created,
        message: created ? "Alt klasör oluşturuldu." : "Klasör zaten mevcut.",
      });
    }

    const { folder, created } = await getOrCreateBusinessFolder(name);
    const { folder: visitFolder, created: visitCreated } =
      await getOrCreateVisitFolder(folder.id, name);

    return NextResponse.json({
      ok: true,
      folder,
      visitFolder,
      created,
      visitCreated,
      message: created
        ? "İşletme klasörü oluşturuldu."
        : "Bu isimde klasör zaten mevcut.",
    });
  } catch (error) {
    return handleDriveRouteError(error);
  }
}
