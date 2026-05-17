import { DriveApp } from "@/components/DriveApp";
import { VektorLensLogo } from "@/components/VektorLensLogo";
import { VektorLensTitle } from "@/components/VektorLensTitle";

export default function Home() {
  return (
    <main className="min-h-dvh px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-7 border-b border-slate-200 pb-6 text-center">
          <VektorLensLogo className="mb-4 h-[4.25rem] w-[4.25rem]" />
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Özel Vektör
          </p>
          <h1 className="mt-2 flex justify-center" aria-label="VEKTÖR LENS">
            <VektorLensTitle />
          </h1>
          <p className="mx-auto mt-2 max-w-[17rem] text-sm leading-relaxed text-slate-600">
            Sahanın dijital gözü, verinin güvenli yolu.
          </p>
        </header>

        <DriveApp />

        <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-1.5 text-center text-xs text-slate-500">
          <VektorLensTitle size="sm" />
          <span>· Mobil saha kullanımı için optimize edildi</span>
        </footer>
      </div>
    </main>
  );
}
