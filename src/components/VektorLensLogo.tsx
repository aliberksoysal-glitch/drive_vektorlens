import Image from "next/image";

/** Özel Vektör marka logosu */
export function VektorLensLogo({
  className = "h-16 w-16",
}: {
  className?: string;
}) {
  return (
    <div
      className={`relative mx-auto overflow-hidden rounded-xl shadow-sm ring-1 ring-slate-200 ${className}`}
    >
      <Image
        src="/vektor-logo.png"
        alt="Özel Vektör"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 72px, 80px"
        priority
      />
    </div>
  );
}
