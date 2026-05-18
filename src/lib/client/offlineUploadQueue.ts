import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DB_NAME = "vektor-lens-offline";
const STORE = "uploads";
const DB_VERSION = 1;

export type OfflineUploadRecord = {
  id: string;
  folderId: string;
  fileName: string;
  mimeType: string;
  blob: ArrayBuffer;
  createdAt: number;
};

interface VLSchema extends DBSchema {
  uploads: {
    key: string;
    value: OfflineUploadRecord;
    indexes: { "by-created": number };
  };
}

let dbPromise: Promise<IDBPDatabase<VLSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<VLSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<VLSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("by-created", "createdAt");
      },
    });
  }
  return dbPromise;
}

export async function enqueueOfflineUpload(input: {
  folderId: string;
  fileName: string;
  mimeType: string;
  blob: ArrayBuffer;
}): Promise<void> {
  const db = await getDb();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const row: OfflineUploadRecord = {
    id,
    folderId: input.folderId,
    fileName: input.fileName,
    mimeType: input.mimeType || "image/jpeg",
    blob: input.blob,
    createdAt: Date.now(),
  };
  await db.put(STORE, row);
}

export async function getOfflineQueueSize(): Promise<number> {
  const db = await getDb();
  return db.count(STORE);
}

export async function listOfflineUploads(): Promise<OfflineUploadRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex(STORE, "by-created");
}

export async function removeOfflineUpload(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function flushOfflineUploadQueue(
  uploadFn: (row: OfflineUploadRecord) => Promise<void>,
): Promise<{ uploaded: number; failed: number }> {
  const rows = await listOfflineUploads();
  let uploaded = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await uploadFn(row);
      await removeOfflineUpload(row.id);
      uploaded++;
    } catch {
      failed++;
    }
  }
  return { uploaded, failed };
}
