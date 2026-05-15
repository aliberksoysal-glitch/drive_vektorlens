import { NextResponse } from "next/server";
import { DriveConfigError } from "@/lib/googleDrive";

export function apiError(message: string, status = 500, code?: string) {
  return NextResponse.json(
    { ok: false, error: message, code: code ?? "DRIVE_ERROR" },
    { status },
  );
}

type OAuthErrorBody = {
  error?: string;
  error_description?: string;
};

function oauthHint(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("response" in error)) {
    return null;
  }

  const data = (error as { response?: { data?: OAuthErrorBody } }).response
    ?.data;

  if (!data?.error) return null;

  if (data.error === "invalid_client") {
    return (
      "OAuth client_secret geçersiz. Google Cloud Console → Kimlik Bilgileri → " +
      "OAuth istemcinizden yeni secret kopyalayın ve .env.local dosyasını güncelleyin."
    );
  }
  if (data.error === "invalid_grant") {
    return (
      "OAuth refresh_token geçersiz veya süresi dolmuş. Yeni refresh token alın " +
      "(GOOGLE_REDIRECT_URI, token alırken kullandığınız URI ile aynı olmalı)."
    );
  }
  return data.error_description ?? data.error;
}

export function handleDriveRouteError(error: unknown) {
  if (error instanceof DriveConfigError) {
    return apiError(error.message, 503, "CONFIG_MISSING");
  }
  const oauthMessage = oauthHint(error);
  if (oauthMessage) {
    console.error("[drive]", oauthMessage);
    return apiError(oauthMessage, 503, "OAUTH_ERROR");
  }
  if (error instanceof Error) {
    console.error("[drive]", error.message);
    return apiError(error.message, 500);
  }
  console.error("[drive]", error);
  return apiError("Beklenmeyen bir hata oluştu.", 500);
}
