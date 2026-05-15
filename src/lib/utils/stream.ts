import { createHash } from "crypto";
import { Readable, Transform } from "stream";

export function webStreamToNode(stream: ReadableStream<Uint8Array>): Readable {
  return Readable.fromWeb(stream as import("stream/web").ReadableStream);
}

/** MD5 hesaplar; chunk'ları olduğu gibi iletir (Drive doğrulaması için). */
export function createMd5Passthrough(): {
  stream: Transform;
  getDigestBase64: () => string;
} {
  const hash = createHash("md5");

  const transform = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  return {
    stream: transform,
    getDigestBase64: () => hash.digest("base64"),
  };
}

export function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
