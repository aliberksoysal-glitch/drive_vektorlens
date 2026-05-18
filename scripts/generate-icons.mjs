/**
 * PWA ikonları: public/pwa-logo.png kaynağından 192/512 + maskable üretir.
 * Kullanım: npm run icons
 */
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "public", "icons");
const logoPath =
  process.env.LOGO_PATH ?? join(__dirname, "..", "public", "pwa-logo.png");

const BG = { r: 255, g: 255, b: 255, alpha: 1 };

async function createIcon(size, filename, maskable) {
  const pad = maskable ? Math.round(size * 0.1) : 0;
  const inner = size - 2 * pad;

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([
      {
        input: await sharp(logoPath)
          .resize(inner, inner, { fit: "contain", background: BG })
          .png()
          .toBuffer(),
        left: pad,
        top: pad,
      },
    ])
    .png()
    .toFile(join(iconsDir, filename));
}

await mkdir(iconsDir, { recursive: true });
await createIcon(192, "icon-192x192.png", false);
await createIcon(512, "icon-512x512.png", false);
await createIcon(512, "icon-maskable-512x512.png", true);
console.log("PWA icons generated in public/icons/ from pwa-logo.png");
