import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

export const dynamic = "force-dynamic";

/**
 * Tarayıcı için httpOnly oturum çerezi (APP_API_KEY ile imzalı JWT).
 * PIN varsayılan olarak APP_API_KEY; ayrı APP_UI_PIN ile sadece tarayıcı kilidi tanımlanabilir.
 */
export async function POST(req: NextRequest) {
  const key = process.env.APP_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({
      ok: true,
      disabled: true,
      message: "API anahtarı kapalı; oturum gerekmez.",
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const pin =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { pin?: unknown }).pin === "string"
      ? (body as { pin: string }).pin
      : "";

  const expected = process.env.APP_UI_PIN?.trim() || key;
  if (pin !== expected) {
    return NextResponse.json(
      { ok: false, error: "Geçersiz PIN." },
      { status: 401 },
    );
  }

  const secret = new TextEncoder().encode(key);
  const token = await new SignJWT({ scope: "drive-api" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("vl_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
