/**
 * OAuth + Drive API uçtan uca test.
 * Kullanım: node scripts/test-drive-full.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

function loadEnvLocal() {
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
}

loadEnvLocal();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
const redirectUri =
  process.env.GOOGLE_REDIRECT_URI ?? "http://localhost";

if (!clientId || !clientSecret || !refreshToken || !rootFolderId) {
  console.error("Eksik env: CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, DRIVE_FOLDER_ID");
  process.exit(1);
}

const auth = new OAuth2Client({ clientId, clientSecret, redirectUri });
auth.setCredentials({ refresh_token: refreshToken });
const drive = google.drive({ version: "v3", auth });

async function run() {
  console.log("1) OAuth token...");
  const { token } = await auth.getAccessToken();
  if (!token) throw new Error("Access token alınamadı");
  console.log("   OK");

  console.log("2) Hesap e-postası...");
  const about = await drive.about.get({ fields: "user(emailAddress)" });
  const email = about.data.user?.emailAddress;
  console.log("   ", email);

  console.log("3) Kök klasör...");
  const root = await drive.files.get({
    fileId: rootFolderId,
    fields: "id,name",
    supportsAllDrives: true,
  });
  console.log("   ", root.data.name, `(${root.data.id})`);

  console.log("4) İşletme klasörleri...");
  const list = await drive.files.list({
    q: `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name)",
    pageSize: 5,
    orderBy: "name",
  });
  const folders = list.data.files ?? [];
  if (!folders.length) {
    console.error("   İşletme klasörü yok — uygulamadan bir işletme oluşturun.");
    process.exit(1);
  }
  const target = folders[0];
  console.log("   Hedef:", target.name, target.id);

  console.log("5) Test dosyası yükleme...");
  const testContent = Buffer.from(`saha-test-${Date.now()}`);
  const { Readable } = await import("stream");
  const res = await drive.files.create({
    requestBody: {
      name: `oauth-test-${Date.now()}.txt`,
      parents: [target.id],
    },
    media: {
      mimeType: "text/plain",
      body: Readable.from(testContent),
    },
    fields: "id,name,parents",
  });
  console.log("   OK fileId:", res.data.id, res.data.name);
  console.log("\nTüm testler başarılı — OAuth yükleme çalışıyor.");
}

run().catch((err) => {
  console.error("\nHATA:", err?.response?.data ?? err.message);
  process.exit(1);
});
