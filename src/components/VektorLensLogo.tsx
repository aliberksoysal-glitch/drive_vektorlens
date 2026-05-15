/** VEKTÖR LENS — vizör / lens marka ikonu */
export function VektorLensLogo({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <div
      className={`relative mx-auto flex items-center justify-center ${className}`}
      aria-hidden
    >
      {/* Dış lens halkası */}
      <span className="absolute inset-0 rounded-[1.35rem] bg-gradient-to-br from-blue-800 to-blue-950 shadow-lg shadow-blue-900/30 ring-2 ring-blue-600/40" />
      {/* İç vizör çerçevesi */}
      <span className="absolute inset-[5px] rounded-[1.1rem] border-2 border-blue-400/50 bg-blue-950/80" />
      {/* Köşe nişanları (viewfinder) */}
      <span className="absolute left-[18%] top-[18%] h-2.5 w-2.5 rounded-sm border-l-2 border-t-2 border-cyan-300/90" />
      <span className="absolute right-[18%] top-[18%] h-2.5 w-2.5 rounded-sm border-r-2 border-t-2 border-cyan-300/90" />
      <span className="absolute bottom-[18%] left-[18%] h-2.5 w-2.5 rounded-sm border-b-2 border-l-2 border-cyan-300/90" />
      <span className="absolute bottom-[18%] right-[18%] h-2.5 w-2.5 rounded-sm border-b-2 border-r-2 border-cyan-300/90" />
      {/* Mercek / iris */}
      <span className="relative flex h-[52%] w-[52%] items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 shadow-inner ring-2 ring-white/25">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[58%] w-[58%] text-white drop-shadow-sm"
        >
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3.25" strokeWidth="1.75" />
          <circle cx="12" cy="13" r="1.25" fill="currentColor" stroke="none" className="text-cyan-200" />
        </svg>
      </span>
    </div>
  );
}
