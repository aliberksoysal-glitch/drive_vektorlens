import { NextRequest, NextResponse } from "next/server";
import { getRootFolderId, listFolderBrowsePage } from "@/lib/googleDrive";
import { handleDriveRouteError } from "@/lib/drive/errors";

export const dynamic = "force-dynamic";

/**
 * Klasör içeriğini listeler (alt klasörler + dosyalar).
 * Query: ?folderId=... (yoksa kök klasör)
 * Sayfalama: ?pageToken=...&pageSize=80
 */
export async function GET(request: NextRequest) {
  try {
    const folderId =
      request.nextUrl.searchParams.get("folderId")?.trim() ||
      getRootFolderId();

    const pageToken =
      request.nextUrl.searchParams.get("pageToken")?.trim() || undefined;
    const pageSizeRaw = request.nextUrl.searchParams.get("pageSize");
    const parsed = pageSizeRaw ? Number.parseInt(pageSizeRaw, 10) : undefined;
    const pageSize =
      typeof parsed === "number" && Number.isFinite(parsed)
        ? parsed
        : undefined;

    const page = await listFolderBrowsePage(folderId, {
      pageToken,
      pageSize,
    });

    return NextResponse.json({
      ok: true,
      ...page,
    });
  } catch (error) {
    return handleDriveRouteError(error);
  }
}
