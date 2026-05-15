import { DriveApp } from "@/components/DriveApp";
import { VektorLensLogo } from "@/components/VektorLensLogo";

export default function Home() {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-7 text-center">
          <VektorLensLogo className="mb-5 h-[4.5rem] w-[4.5rem]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">
            Özel Vektör
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-blue-900 sm:text-[1.65rem]">
            VEKTÖR LENS
          </h1>
          <p className="mx-auto mt-2 max-w-[17rem] text-sm leading-relaxed text-slate-600">
            Sahanın dijital gözü, verinin güvenli yolu.
          </p>
        </header>

        <DriveApp />

        <footer className="mt-8 text-center text-xs text-slate-500">
          VEKTÖR LENS · Mobil saha kullanımı için optimize edildi
        </footer>
      </div>
    </main>
  );
}
