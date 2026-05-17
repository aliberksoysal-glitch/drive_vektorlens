import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateBusinessFolder,
  getOrCreateVisitFolder,
  listBusinessFolders,
} from "@/lib/googleDrive";
import { handleDriveRouteError } from "@/lib/drive/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const businesses = await listBusinessFolders();
    return NextResponse.json({ ok: true, businesses });
  } catch (error) {
    return handleDriveRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name : "";

    const trimmed = name.trim();
    if (!trimmed) {
      return NextResponse.json(
        { ok: false, error: "İşletme adı gerekli." },
        { status: 400 },
      );
    }

    const { folder, created } = await getOrCreateBusinessFolder(trimmed);
    const { folder: visitFolder, created: visitCreated } =
      await getOrCreateVisitFolder(folder.id, trimmed);

    return NextResponse.json({
      ok: true,
      folder,
      visitFolder,
      created,
      visitCreated,
    });
  } catch (error) {
    return handleDriveRouteError(error);
  }
}
