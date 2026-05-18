/** Edge uyumlu HS256 JWT doğrulama (payload.exp zorunlu). */

function base64UrlToUint8Array(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function verifyJwtHs256Edge(
  token: string,
  secret: string,
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, sigB64] = parts;
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  let sig: Uint8Array;
  try {
    sig = base64UrlToUint8Array(sigB64);
  } catch {
    return false;
  }
  let payloadBytes: Uint8Array;
  try {
    payloadBytes = base64UrlToUint8Array(payloadB64);
  } catch {
    return false;
  }
  let payload: { exp?: number };
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
      exp?: number;
    };
  } catch {
    return false;
  }
  if (typeof payload.exp !== "number" || Date.now() / 1000 >= payload.exp) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      new Uint8Array(sig),
      data,
    );
  } catch {
    return false;
  }
}
