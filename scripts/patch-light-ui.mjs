import { readFileSync, writeFileSync } from "fs";

const path = "src/components/DriveApp.tsx";
let s = readFileSync(path, "utf8");

const D = "div";

// Fix invalid motion tags
s = s.replace(/<\/?motion\b/g, (m) => m.replace("motion", D));

const listStart = s.indexOf('className="mt-4 max-h-72 overflow-y-auto');
if (listStart === -1) {
  // already patched?
  if (s.includes("divide-y divide-slate-100")) {
    console.log("list already patched");
  } else {
    console.error("list block not found");
    process.exit(1);
  }
} else {
  const sliceStart = s.lastIndexOf("<" + D, listStart);
  const blockEnd = s.indexOf("\n      )}", listStart) + "\n      )}".length;

  const listNew = `        <${D} className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          {filteredBusinesses.length === 0 ? (
            <${D} className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-900">
                {searchQuery ? "Sonuç bulunamadı" : "Henüz işletme yok"}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {searchQuery
                  ? "Farklı bir arama deneyin"
                  : "Yukarıdan yeni işletme ekleyebilirsiniz"}
              </p>
            </${D}>
          ) : (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {filteredBusinesses.map((business) => (
                <li key={business.id}>
                  <button
                    type="button"
                    onClick={() => onSelectBusiness(business)}
                    className="group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-900 group-hover:text-blue-700">
                      {business.name}
                    </span>
                    <ChevronIcon className="shrink-0 text-slate-300 group-hover:text-blue-500" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </${D}>
      )}`;

  s = s.slice(0, sliceStart) + listNew + s.slice(blockEnd);
}

s = s.replace(
  "bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-10 text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-800 active:scale-[0.99]",
  "bg-blue-600 px-6 py-10 text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800",
);

if (!s.includes("Fotoğraf yükleme")) {
  s = s.replace(
    '<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">',
    `<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <${D} className="mb-4 border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Fotoğraf yükleme</h2>
        <p className="mt-0.5 text-sm text-slate-600">Saha kayıtlarını Drive'a aktarın</p>
      </${D}>`,
  );
}

s = s.replace(
  'className="rounded-xl border border-blue-200 bg-blue-50 p-4"',
  'className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-blue-100"',
);

if (!s.includes("ChevronIcon({ className")) {
  s = s.replace(
    `function ChevronIcon() {
  return (
    <svg
      className="h-5 w-5 text-slate-400"`,
    `function ChevronIcon({ className = "h-5 w-5 text-slate-400" }: { className?: string }) {
  return (
    <svg
      className={className}`,
  );
}

writeFileSync(path, s, "utf8");
console.log("done");
