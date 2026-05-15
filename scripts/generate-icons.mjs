import { mkdir, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "public", "icons");

const themeColor = { r: 14, g: 165, b: 233, alpha: 1 };
const background = { r: 15, g: 23, b: 42, alpha: 1 };

async function createIcon(size, filename, maskable = false) {
  const padding = maskable ? Math.round(size * 0.2) : Math.round(size * 0.18);
  const inner = size - padding * 2;

  const cameraSvg = `
    <svg width="${inner}" height="${inner}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" fill="none"/>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
        fill="none" stroke="white" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="13" r="3" fill="none" stroke="white" stroke-width="1.75"/>
    </svg>
  `;

  const camera = await sharp(Buffer.from(cameraSvg)).resize(inner, inner).png().toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: camera, top: padding, left: padding }])
    .png()
    .toFile(join(iconsDir, filename));
}

await mkdir(iconsDir, { recursive: true });
await createIcon(192, "icon-192x192.png");
await createIcon(512, "icon-512x512.png");
await createIcon(512, "icon-maskable-512x512.png", true);
console.log("PWA icons generated in public/icons/");
