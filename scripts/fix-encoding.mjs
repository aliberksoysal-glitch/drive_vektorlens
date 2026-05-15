import { readFileSync, writeFileSync } from "fs";

const p = "src/components/DriveApp.tsx";
let lines = readFileSync(p, "utf8").split(/\r?\n/);

const lineFixes = {
  51: '        throw new Error(data.error ?? "İşletmeler yüklenemedi.");',
  59: '        message:',
  60: '          err instanceof Error ? err.message : "İşletmeler yüklenemedi.",',
  72: '          throw new Error(data.error ?? "Drive bağlantısı kurulamadı.");',
  76: '          status: "connected",',
  77: '          rootFolderName: data.rootFolder?.name ?? "İşletmeler",',
  188: '      setCreateError("İşletme adı gerekli.");',
  372: '            <h2 className="text-lg font-semibold text-slate-900">İşletme seçimi</h2>',
  504: '          Yeni İşletme',
  507: "          Drive&apos;da yeni bir klasör oluşturulacak",
  516: '              İşletme Adı',
  556: '                "Oluştur"',
  578: '          <p className="text-xs font-medium uppercase tracking-wide text-blue-600/80">',
  579: '            Seçilen işletme',
  589: '          Değiştir',
};

for (const [idx, text] of Object.entries(lineFixes)) {
  const i = Number(idx) - 1;
  if (i >= 0 && i < lines.length) {
    if (text.includes("message:") && text === "message:") continue;
    lines[i] = text;
  }
}

// Line 59-60 special - read and fix if needed
if (lines[58]?.includes("message:")) {
  lines[59] =
    '          err instanceof Error ? err.message : "İşletmeler yüklenemedi.",';
}

writeFileSync(p, lines.join("\n"), "utf8");
console.log("fixed");
