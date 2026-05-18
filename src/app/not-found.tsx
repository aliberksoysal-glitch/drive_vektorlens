import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <p className="text-lg font-semibold text-slate-800">Sayfa bulunamadı</p>
      <Link href="/" className="mt-4 text-sm font-medium text-blue-800 underline">
        Ana sayfaya dön
      </Link>
    </main>
  );
}
