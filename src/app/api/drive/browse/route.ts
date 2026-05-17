import { NextRequest, NextResponse } from "next/server";
import { getRootFolderId, listFolderContents } from "@/lib/googleDrive";
import { handleDriveRouteError } from "@/lib/drive/errors";

export const dynamic = "force-dynamic";

/**
 * Klasör içeriğini listeler (alt klasörler + dosyalar).
 * Query: ?folderId=... (yoksa kök klasör)
 */
export async function GET(request: NextRequest) {
  try {
    const folderId =
      request.nextUrl.searchParams.get("folderId")?.trim() ||
      getRootFolderId();

    const contents = await listFolderContents(folderId);

    return NextResponse.json({
      ok: true,
      ...contents,
    });
  } catch (error) {
    return handleDriveRouteError(error);
  }
}
