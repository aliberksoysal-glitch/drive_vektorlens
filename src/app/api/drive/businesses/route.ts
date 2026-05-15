import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateBusinessFolder,
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

    const { folder, created } = await getOrCreateBusinessFolder(name);

    return NextResponse.json({
      ok: true,
      folder,
      created,
    });
  } catch (error) {
    return handleDriveRouteError(error);
  }
}
