import { NextRequest, NextResponse } from "next/server";
import { deleteDriveItem } from "@/lib/googleDrive";
import { handleDriveRouteError } from "@/lib/drive/errors";

export const dynamic = "force-dynamic";

/**
 * Drive öğesini siler (dosya veya klasör).
 * Query: ?fileId=...
 */
export async function DELETE(request: NextRequest) {
  try {
    const fileId = request.nextUrl.searchParams.get("fileId")?.trim();
    if (!fileId) {
      return NextResponse.json(
        { ok: false, error: "fileId gerekli." },
        { status: 400 },
      );
    }

    const deleted = await deleteDriveItem(fileId);

    return NextResponse.json({
      ok: true,
      deleted: {
        id: deleted.id,
        name: deleted.name,
        mimeType: deleted.mimeType,
      },
    });
  } catch (error) {
    return handleDriveRouteError(error);
  }
}
