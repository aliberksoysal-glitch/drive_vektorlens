import { NextRequest, NextResponse } from "next/server";
import { deleteDriveItem, renameDriveItem } from "@/lib/googleDrive";
import { handleDriveRouteError } from "@/lib/drive/errors";

export const dynamic = "force-dynamic";

/**
 * Öğeyi yeniden adlandırır.
 * Body: { fileId: string, name: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      fileId?: string;
      name?: string;
    };
    const fileId = body.fileId?.trim();
    const name = body.name?.trim();

    if (!fileId) {
      return NextResponse.json(
        { ok: false, error: "fileId gerekli." },
        { status: 400 },
      );
    }
    if (!name) {
      return NextResponse.json(
        { ok: false, error: "name gerekli." },
        { status: 400 },
      );
    }

    const updated = await renameDriveItem(fileId, name);

    return NextResponse.json({
      ok: true,
      item: updated,
    });
  } catch (error) {
    return handleDriveRouteError(error);
  }
}

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
