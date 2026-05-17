/** Kamera lensi — VEKTÖR yazısındaki Ö harfinin yerine */
function LensO({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center text-blue-800 ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="1.75"
          opacity="0.9"
        />
        <circle
          cx="12"
          cy="12"
          r="6.25"
          stroke="currentColor"
          strokeWidth="1.25"
          opacity="0.55"
        />
        <circle cx="12" cy="12" r="2.75" fill="currentColor" opacity="0.35" />
        <circle cx="12" cy="12" r="1.1" fill="currentColor" />
        <path
          d="M12 2.5 L13.2 6.8 L12 7.5 L10.8 6.8 Z"
          fill="currentColor"
          opacity="0.2"
        />
      </svg>
    </span>
  );
}

type VektorLensTitleProps = {
  /** lg: sayfa başlığı, sm: footer / küçük kullanım */
  size?: "lg" | "sm";
  className?: string;
  /** false ise yalnızca VEKT[lens]R (LENS kısmı yok) */
  showLensSuffix?: boolean;
};

export function VektorLensTitle({
  size = "lg",
  className = "",
  showLensSuffix = true,
}: VektorLensTitleProps) {
  const isLarge = size === "lg";
  const textSize = isLarge
    ? "text-2xl sm:text-[1.65rem]"
    : "text-xs font-semibold";
  const lensSize = isLarge
    ? "h-[0.88em] w-[0.88em] -translate-y-[0.07em]"
    : "h-[0.85em] w-[0.85em] -translate-y-[0.05em]";

  return (
    <span
      className={`inline-flex items-baseline justify-center font-bold tracking-tight text-slate-900 ${textSize} ${className}`}
    >
      <span>VEKT</span>
      <LensO className={`mx-px ${lensSize}`} />
      <span>R</span>
      {showLensSuffix && (
        <span className={isLarge ? "ml-2.5" : "ml-1.5"}>LENS</span>
      )}
    </span>
  );
}
