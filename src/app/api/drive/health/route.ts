import { NextResponse } from "next/server";
import { verifyDriveConnection } from "@/lib/googleDrive";
import { handleDriveRouteError } from "@/lib/drive/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { accountEmail, rootFolder } = await verifyDriveConnection();

    return NextResponse.json({
      ok: true,
      connected: true,
      authMode: "oauth",
      accountEmail,
      rootFolder,
      uploadReady: true,
    });
  } catch (error) {
    return handleDriveRouteError(error);
  }
}
