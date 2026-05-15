import { readFileSync } from "fs";
import { OAuth2Client } from "google-auth-library";

function loadEnvLocal() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    console.error(".env.local okunamadı");
    process.exit(1);
  }
}

loadEnvLocal();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
const redirectUri =
  process.env.GOOGLE_REDIRECT_URI ?? "http://localhost";

if (!clientId || !clientSecret || !refreshToken) {
  console.error("OAuth env eksik");
  process.exit(1);
}

const auth = new OAuth2Client({ clientId, clientSecret, redirectUri });
auth.setCredentials({ refresh_token: refreshToken });

try {
  const { token } = await auth.getAccessToken();
  console.log("OK access token alındı:", token ? `${token.slice(0, 20)}...` : "yok");
  process.exit(0);
} catch (err) {
  console.error("OAuth hata:", err?.response?.data ?? err.message);
  process.exit(1);
}
