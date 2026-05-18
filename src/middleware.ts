import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwtHs256Edge } from "@/lib/jwtEdge";

/**
 * APP_API_KEY ayarlıysa /api/drive/* için X-API-Key / Bearer **veya**
 * /api/auth/unlock ile verilen vl_session çerezi (HS256 JWT) gerekir.
 */
export async function middleware(request: NextRequest) {
  const key = process.env.APP_API_KEY?.trim();
  if (!key) return NextResponse.next();

  const header =
    request.headers.get("x-api-key") ?? request.headers.get("authorization");
  const bearer =
    header?.startsWith("Bearer ") ? header.slice(7).trim() : header;

  if (bearer === key) {
    return NextResponse.next();
  }

  const token = request.cookies.get("vl_session")?.value;
  if (token) {
    const sessionOk = await verifyJwtHs256Edge(token, key);
    if (sessionOk) {
      return NextResponse.next();
    }
  }

  return NextResponse.json(
    { ok: false, error: "Yetkisiz istek." },
    { status: 401 },
  );
}

export const config = {
  matcher: "/api/drive/:path*",
};
