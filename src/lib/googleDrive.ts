import type { Readable } from "stream";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { buildVisitFolderName } from "@/lib/drive/folderNaming";
import { createMd5Passthrough, escapeDriveQueryValue } from "@/lib/utils/stream";

const FOLDER_MIME = "application/vnd.google-apps.folder";

export class DriveConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriveConfigError";
  }
}

export type DriveConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  redirectUri: string;
  rootFolderId: string;
};

export type BusinessFolder = {
  id: string;
  name: string;
};

export type UploadResult = {
  fileId: string;
  name: string;
  size: string | null | undefined;
  md5Checksum: string;
  verified: boolean;
};

export type RootFolderInfo = {
  id: string;
  name: string;
};

export type DriveBrowseFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  thumbnailLink?: string;
  webViewLink?: string;
};

export type DriveBrowseResult = {
  folder: BusinessFolder;
  parentId: string | null;
  folders: BusinessFolder[];
  files: DriveBrowseFile[];
};

/** Tek Drive API sayfası; ilk istekte folder + parentId dolu, devamında boş. */
export type DriveBrowsePagePayload = {
  folder?: BusinessFolder;
  parentId?: string | null;
  folders: BusinessFolder[];
  files: DriveBrowseFile[];
  nextPageToken?: string;
};

let cachedOAuth: OAuth2Client | null = null;

/** Tırnaklı .env değerlerini ve fazla boşlukları temizler. */
function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;

  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value.trim() || undefined;
}

/** OAuth 2.0 ortam değişkenlerini okur ve doğrular. */
export function getDriveConfig(): DriveConfig {
  const clientId = readEnv("GOOGLE_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_CLIENT_SECRET");
  const refreshToken = readEnv("GOOGLE_REFRESH_TOKEN");
  const rootFolderId =
    readEnv("GOOGLE_DRIVE_FOLDER_ID") ?? readEnv("GOOGLE_DRIVE_ROOT_FOLDER_ID");
  const redirectUri =
    readEnv("GOOGLE_REDIRECT_URI") ?? "http://localhost";

  if (!clientId || !clientSecret || !refreshToken) {
    throw new DriveConfigError(
      ".env.local dosyasında GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ve GOOGLE_REFRESH_TOKEN tanımlı olmalı.",
    );
  }

  if (!rootFolderId) {
    throw new DriveConfigError(
      ".env.local dosyasında GOOGLE_DRIVE_FOLDER_ID tanımlı olmalı.",
    );
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    redirectUri,
    rootFolderId,
  };
}

export function getRootFolderId(): string {
  return getDriveConfig().rootFolderId;
}

function getOAuth2Client(): OAuth2Client {
  if (cachedOAuth) return cachedOAuth;

  const { clientId, clientSecret, refreshToken, redirectUri } =
    getDriveConfig();

  cachedOAuth = new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  });
  cachedOAuth.setCredentials({ refresh_token: refreshToken });

  return cachedOAuth;
}

/** OAuth erişim token'ını yeniler ve doğrular. */
export async function ensureDriveAuth(): Promise<OAuth2Client> {
  const auth = getOAuth2Client();
  const token = await auth.getAccessToken();
  if (!token) {
    throw new DriveConfigError(
      "OAuth erişim token'ı alınamadı. Refresh token ve client secret değerlerini kontrol edin.",
    );
  }
  return auth;
}

export function getDriveClient() {
  return google.drive({ version: "v3", auth: getOAuth2Client() });
}

/** Bağlı Google hesabının e-posta adresi (ör. ozelvektorosgb@gmail.com). */
export async function getAuthenticatedUserEmail(): Promise<string> {
  await ensureDriveAuth();
  const drive = getDriveClient();
  const res = await drive.about.get({ fields: "user(emailAddress)" });
  const email = res.data.user?.emailAddress;
  if (!email) {
    throw new Error("Google hesap e-postası alınamadı.");
  }
  return email;
}

/** Bağlantı ve kök klasör erişimini doğrular. */
export async function verifyDriveConnection(): Promise<{
  accountEmail: string;
  rootFolder: RootFolderInfo;
}> {
  await ensureDriveAuth();
  const rootFolderId = getRootFolderId();
  const drive = getDriveClient();

  const folder = await drive.files.get({
    fileId: rootFolderId,
    fields: "id, name",
    supportsAllDrives: true,
  });

  if (!folder.data.id || !folder.data.name) {
    throw new Error(
      "Kök klasöre erişilemedi. GOOGLE_DRIVE_FOLDER_ID değerini kontrol edin.",
    );
  }

  const accountEmail = await getAuthenticatedUserEmail();

  return {
    accountEmail,
    rootFolder: { id: folder.data.id, name: folder.data.name },
  };
}

/** Kök klasörün altındaki işletme klasörlerini listeler. */
export async function listBusinessFolders(): Promise<BusinessFolder[]> {
  await ensureDriveAuth();
  const drive = getDriveClient();
  const rootFolderId = getRootFolderId();
  const folders: BusinessFolder[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${rootFolderId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
      fields: "nextPageToken, files(id, name)",
      orderBy: "name",
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    for (const file of res.data.files ?? []) {
      if (file.id && file.name) {
        folders.push({ id: file.id, name: file.name });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return folders;
}

export async function getOrCreateBusinessFolder(
  name: string,
): Promise<{ folder: BusinessFolder; created: boolean }> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("İşletme adı boş olamaz.");
  }

  const existing = await findBusinessFolderByName(trimmed);
  if (existing) {
    return { folder: existing, created: false };
  }

  const created = await createBusinessFolder(trimmed);
  return { folder: created, created: true };
}

export async function resolveBusinessFolderId(
  businessName: string,
): Promise<string> {
  const { folder } = await getOrCreateBusinessFolder(businessName);
  return folder.id;
}

/** Yükleme hedefinin kök klasörün doğrudan alt klasörü olduğunu doğrular. */
export async function assertBusinessFolderId(folderId: string): Promise<void> {
  await ensureDriveAuth();
  const drive = getDriveClient();
  const rootFolderId = getRootFolderId();

  const res = await drive.files.get({
    fileId: folderId,
    fields: "id, mimeType, parents",
    supportsAllDrives: true,
  });

  if (res.data.mimeType !== FOLDER_MIME) {
    throw new Error("Geçersiz hedef: bir klasör ID'si gerekli.");
  }

  if (!res.data.parents?.includes(rootFolderId)) {
    throw new Error(
      "Bu klasör kök dizin altında değil. Lütfen listeden bir işletme seçin.",
    );
  }
}

/** Yükleme hedefi: uygulama kök klasörünün altındaki herhangi bir klasör (herhangi bir derinlik). */
export async function assertUploadFolderId(folderId: string): Promise<void> {
  await ensureDriveAuth();
  const drive = getDriveClient();
  const rootFolderId = getRootFolderId();

  if (folderId === rootFolderId) {
    throw new Error("Kök klasöre doğrudan yükleme yapılamaz.");
  }

  let walker: string | undefined = folderId;

  for (let depth = 0; depth < 40; depth++) {
    if (!walker) {
      break;
    }

    const currentId: string = walker;
    const fileRes = await drive.files.get({
      fileId: currentId,
      fields: "id, mimeType, parents",
      supportsAllDrives: true,
    });

    if (fileRes.data.mimeType !== FOLDER_MIME) {
      throw new Error("Geçersiz hedef: bir klasör ID'si gerekli.");
    }

    const parents = fileRes.data.parents ?? [];
    if (parents.includes(rootFolderId)) {
      return;
    }

    walker = parents[0];
  }

  throw new Error(
    "Geçersiz yükleme hedefi. Uygulama kök klasörü altında bir klasör seçin.",
  );
}

export async function getOrCreateVisitFolder(
  businessFolderId: string,
  businessName: string,
  visitDate: Date = new Date(),
): Promise<{ folder: BusinessFolder; created: boolean }> {
  await assertBusinessFolderId(businessFolderId);

  const trimmedName = businessName.trim();
  if (!trimmedName) {
    throw new Error("İşletme adı boş olamaz.");
  }

  const visitName = buildVisitFolderName(trimmedName, visitDate);
  const existing = await findFolderByNameUnderParent(
    businessFolderId,
    visitName,
  );
  if (existing) {
    return { folder: existing, created: false };
  }

  const created = await createFolderUnderParent(businessFolderId, visitName);
  return { folder: created, created: true };
}

/** Ziyaret klasörü altında alt klasör bulur veya oluşturur (örn. Pano, Merdiven). */
export async function getOrCreateChildFolder(
  parentFolderId: string,
  name: string,
): Promise<{ folder: BusinessFolder; created: boolean }> {
  await assertUploadFolderId(parentFolderId);

  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Alt klasör adı boş olamaz.");
  }

  const existing = await findFolderByNameUnderParent(parentFolderId, trimmed);
  if (existing) {
    return { folder: existing, created: false };
  }

  const created = await createFolderUnderParent(parentFolderId, trimmed);
  return { folder: created, created: true };
}

export async function uploadStreamToDrive(params: {
  folderId: string;
  fileName: string;
  mimeType: string;
  body: Readable;
}): Promise<UploadResult> {
  await assertUploadFolderId(params.folderId);

  const drive = getDriveClient();
  const { stream: checksumStream, getDigestBase64 } = createMd5Passthrough();
  const uploadStream = params.body.pipe(checksumStream);

  const res = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: uploadStream,
    },
    fields: "id, name, size, md5Checksum",
    supportsAllDrives: true,
  });

  const fileId = res.data.id;
  const md5FromDrive = res.data.md5Checksum;
  const localMd5 = getDigestBase64();

  if (!fileId) {
    throw new Error("Dosya yüklemesi tamamlanamadı.");
  }

  if (!md5FromDrive) {
    await safeDeleteFile(fileId);
    throw new Error(
      "Drive dosya doğrulama bilgisi döndürmedi. Yükleme iptal edildi.",
    );
  }

  if (md5FromDrive !== localMd5) {
    await safeDeleteFile(fileId);
    throw new Error(
      "Dosya bütünlük kontrolü başarısız (checksum uyuşmazlığı). Yükleme geri alındı.",
    );
  }

  return {
    fileId,
    name: res.data.name ?? params.fileName,
    size: res.data.size,
    md5Checksum: md5FromDrive,
    verified: true,
  };
}

async function findFolderByNameUnderParent(
  parentId: string,
  name: string,
): Promise<BusinessFolder | null> {
  const drive = getDriveClient();
  const safeName = escapeDriveQueryValue(name);

  const res = await drive.files.list({
    q: `name='${safeName}' and '${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const file = res.data.files?.[0];
  if (!file?.id || !file.name) return null;
  return { id: file.id, name: file.name };
}

async function findBusinessFolderByName(
  name: string,
): Promise<BusinessFolder | null> {
  return findFolderByNameUnderParent(getRootFolderId(), name);
}

async function createFolderUnderParent(
  parentId: string,
  name: string,
): Promise<BusinessFolder> {
  await ensureDriveAuth();
  const drive = getDriveClient();

  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: "id, name",
    supportsAllDrives: true,
  });

  if (!res.data.id || !res.data.name) {
    throw new Error("Klasör oluşturulamadı.");
  }

  return { id: res.data.id, name: res.data.name };
}

async function createBusinessFolder(name: string): Promise<BusinessFolder> {
  return createFolderUnderParent(getRootFolderId(), name);
}

/** Klasörün uygulama kök dizini altında olduğunu doğrular. */
export async function assertReadableFolderId(
  folderId: string,
): Promise<BusinessFolder> {
  await ensureDriveAuth();
  const drive = getDriveClient();
  const rootFolderId = getRootFolderId();

  let targetName = "";
  let walker: string | undefined = folderId;

  for (let depth = 0; depth < 10; depth++) {
    if (!walker) break;

    const currentId: string = walker;
    const fileRes = await drive.files.get({
      fileId: currentId,
      fields: "id, name, mimeType, parents",
      supportsAllDrives: true,
    });

    if (currentId === folderId) {
      if (fileRes.data.mimeType !== FOLDER_MIME) {
        throw new Error("Geçersiz klasör.");
      }
      if (!fileRes.data.id || !fileRes.data.name) {
        throw new Error("Klasör bilgisi alınamadı.");
      }
      targetName = fileRes.data.name;
    }

    if (currentId === rootFolderId) {
      return { id: folderId, name: targetName || fileRes.data.name! };
    }

    const parents = fileRes.data.parents ?? [];
    walker = parents[0];
  }

  throw new Error("Bu klasöre erişim yok.");
}

/** Tek sayfa klasör içeriği (API sayfalaması). */
export async function listFolderBrowsePage(
  folderId: string,
  options?: { pageToken?: string; pageSize?: number },
): Promise<DriveBrowsePagePayload> {
  const drive = getDriveClient();
  const rootFolderId = getRootFolderId();
  const rawSize = options?.pageSize ?? 80;
  const pageSize = Math.min(200, Math.max(10, Number.isFinite(rawSize) ? rawSize : 80));
  const pageToken = options?.pageToken?.trim() || undefined;

  let folder: BusinessFolder | undefined;
  let parentId: string | null | undefined;

  if (!pageToken) {
    folder = await assertReadableFolderId(folderId);
    const meta = await drive.files.get({
      fileId: folderId,
      fields: "parents",
      supportsAllDrives: true,
    });
    const parents = meta.data.parents ?? [];
    parentId = parents[0] ?? null;
    if (folderId === rootFolderId) {
      parentId = null;
    }
  } else {
    await ensureDriveAuth();
  }

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields:
      "nextPageToken, files(id, name, mimeType, modifiedTime, size, thumbnailLink, webViewLink)",
    orderBy: "folder,name",
    pageSize,
    pageToken,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const folders: BusinessFolder[] = [];
  const files: DriveBrowseFile[] = [];

  for (const file of res.data.files ?? []) {
    if (!file.id || !file.name || !file.mimeType) continue;

    if (file.mimeType === FOLDER_MIME) {
      folders.push({ id: file.id, name: file.name });
    } else {
      files.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime ?? undefined,
        size: file.size ?? undefined,
        thumbnailLink: file.thumbnailLink ?? undefined,
        webViewLink: file.webViewLink ?? undefined,
      });
    }
  }

  const next = res.data.nextPageToken ?? undefined;
  const chunk = { folders, files, nextPageToken: next };

  if (!pageToken && folder) {
    return { folder, parentId: parentId ?? null, ...chunk };
  }

  return chunk;
}

/** Bir klasörün tüm alt klasörlerini listeler (ortak havuz / canlı senkron). */
export async function listChildFolders(
  parentFolderId: string,
): Promise<BusinessFolder[]> {
  await assertUploadFolderId(parentFolderId);

  const merged: BusinessFolder[] = [];
  let token: string | undefined;

  do {
    const page = await listFolderBrowsePage(parentFolderId, {
      pageToken: token,
      pageSize: 100,
    });
    merged.push(...page.folders);
    token = page.nextPageToken;
  } while (token);

  return merged.sort((a, b) =>
    a.name.localeCompare(b.name, "tr", { sensitivity: "base" }),
  );
}

/** Tüm sayfaları birleştirir (sunucu tarafı tam liste). */
export async function listFolderContents(
  folderId: string,
): Promise<DriveBrowseResult> {
  const mergedFolders: BusinessFolder[] = [];
  const mergedFiles: DriveBrowseFile[] = [];
  let token: string | undefined;
  let folder: BusinessFolder | undefined;
  let parentId: string | null = null;

  for (;;) {
    const page = await listFolderBrowsePage(folderId, {
      pageToken: token,
      pageSize: 200,
    });
    if (page.folder) folder = page.folder;
    if (page.parentId !== undefined) parentId = page.parentId;
    mergedFolders.push(...page.folders);
    mergedFiles.push(...page.files);
    token = page.nextPageToken;
    if (!token) break;
  }

  if (!folder) {
    throw new Error("Klasör bilgisi alınamadı.");
  }

  return {
    folder,
    parentId,
    folders: mergedFolders,
    files: mergedFiles,
  };
}

async function safeDeleteFile(fileId: string) {
  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId, supportsAllDrives: true });
  } catch {
    // yut
  }
}

type DriveItemMeta = {
  id: string;
  name: string;
  mimeType: string;
};

/** Öğenin uygulama kök klasörü altında olduğunu doğrular (kök silinemez). */
export async function assertDeletableItemId(
  itemId: string,
): Promise<DriveItemMeta> {
  await ensureDriveAuth();
  const drive = getDriveClient();
  const rootFolderId = getRootFolderId();

  if (itemId === rootFolderId) {
    throw new Error("Kök klasör silinemez.");
  }

  let walker: string | undefined = itemId;
  let target: DriveItemMeta | null = null;

  for (let depth = 0; depth < 12; depth++) {
    if (!walker) break;

    const currentId: string = walker;
    const fileRes = await drive.files.get({
      fileId: currentId,
      fields: "id, name, mimeType, parents",
      supportsAllDrives: true,
    });

    if (currentId === itemId) {
      if (!fileRes.data.id || !fileRes.data.name || !fileRes.data.mimeType) {
        throw new Error("Öğe bilgisi alınamadı.");
      }
      target = {
        id: fileRes.data.id,
        name: fileRes.data.name,
        mimeType: fileRes.data.mimeType,
      };
    }

    if (currentId === rootFolderId) {
      if (!target) {
        throw new Error("Öğe bulunamadı.");
      }
      return target;
    }

    const parents = fileRes.data.parents ?? [];
    walker = parents[0];
  }

  throw new Error("Bu öğe silinemez.");
}

async function deleteFolderRecursive(folderId: string) {
  const drive = getDriveClient();
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken, files(id, mimeType)",
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    for (const file of res.data.files ?? []) {
      if (!file.id) continue;
      if (file.mimeType === FOLDER_MIME) {
        await deleteFolderRecursive(file.id);
      } else {
        await drive.files.delete({
          fileId: file.id,
          supportsAllDrives: true,
        });
      }
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  await drive.files.delete({ fileId: folderId, supportsAllDrives: true });
}

/** Drive öğesinin adını günceller (kök altında olmalı). */
export async function renameDriveItem(
  itemId: string,
  newName: string,
): Promise<{ id: string; name: string }> {
  await ensureDriveAuth();
  await assertDeletableItemId(itemId);

  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error("Ad boş olamaz.");
  }

  const drive = getDriveClient();
  const res = await drive.files.update({
    fileId: itemId,
    requestBody: { name: trimmed },
    fields: "id, name",
    supportsAllDrives: true,
  });

  if (!res.data.id || !res.data.name) {
    throw new Error("Yeniden adlandırılamadı.");
  }

  return { id: res.data.id, name: res.data.name };
}

/** Drive öğesini kalıcı olarak siler (klasörler içerikleriyle birlikte). */
export async function deleteDriveItem(itemId: string): Promise<DriveItemMeta> {
  const item = await assertDeletableItemId(itemId);
  if (item.mimeType === FOLDER_MIME) {
    await deleteFolderRecursive(item.id);
  } else {
    const drive = getDriveClient();
    await drive.files.delete({ fileId: item.id, supportsAllDrives: true });
  }
  return item;
}
