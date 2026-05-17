import Image from "next/image";
import type { CSSProperties } from "react";

function LensRing({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle
        cx="40"
        cy="40"
        r="34"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.35"
      />
      <circle
        cx="40"
        cy="40"
        r="24"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />
      <circle cx="40" cy="40" r="10" fill="currentColor" opacity="0.2" />
      <circle
        cx="40"
        cy="40"
        r="3"
        fill="currentColor"
        opacity="0.45"
      />
    </svg>
  );
}

function Aperture({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 72" fill="none" className={className} aria-hidden>
      <circle
        cx="36"
        cy="36"
        r="30"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.4"
      />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <path
          key={deg}
          d="M36 10 L44 34 L36 36 L28 34 Z"
          fill="currentColor"
          opacity="0.12"
          transform={`rotate(${deg} 36 36)`}
        />
      ))}
    </svg>
  );
}

function FocusFrame({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <path
        d="M8 20V8h12M56 8H44v12M8 44v12h12M56 56V44H44"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle
        cx="32"
        cy="32"
        r="14"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="3 4"
        opacity="0.3"
      />
    </svg>
  );
}

function ShutterFlare({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path
        d="M24 4 L28 20 L24 24 L20 20 Z"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M44 24 L28 28 L24 24 L28 20 Z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M24 44 L20 28 L24 24 L28 28 Z"
        fill="currentColor"
        opacity="0.1"
      />
      <path
        d="M4 24 L20 20 L24 24 L20 28 Z"
        fill="currentColor"
        opacity="0.13"
      />
    </svg>
  );
}

function DataNode({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <circle cx="20" cy="20" r="3" fill="currentColor" opacity="0.35" />
      <circle cx="6" cy="10" r="2" fill="currentColor" opacity="0.2" />
      <circle cx="34" cy="12" r="2" fill="currentColor" opacity="0.2" />
      <circle cx="8" cy="32" r="2" fill="currentColor" opacity="0.18" />
      <path
        d="M20 20 L6 10 M20 20 L34 12 M20 20 L8 32"
        stroke="currentColor"
        strokeWidth="0.75"
        opacity="0.22"
      />
    </svg>
  );
}

const FLOATERS = [
  {
    id: "lens-1",
    type: "lens" as const,
    className: "float-item float-drift-a left-[6%] top-[12%] h-16 w-16 text-blue-600/50",
    duration: 22,
    delay: 0,
  },
  {
    id: "lens-2",
    type: "lens" as const,
    className: "float-item float-drift-b right-[8%] top-[28%] h-20 w-20 text-indigo-500/45",
    duration: 26,
    delay: -4,
  },
  {
    id: "aperture-1",
    type: "aperture" as const,
    className: "float-item float-drift-c left-[12%] top-[58%] h-14 w-14 text-blue-700/40",
    duration: 19,
    delay: -7,
  },
  {
    id: "aperture-2",
    type: "aperture" as const,
    className: "float-item float-spin-slow right-[14%] bottom-[22%] h-12 w-12 text-cyan-600/35",
    duration: 32,
    delay: -2,
  },
  {
    id: "frame-1",
    type: "frame" as const,
    className: "float-item float-drift-d right-[22%] top-[8%] h-11 w-11 text-blue-800/30",
    duration: 24,
    delay: -9,
  },
  {
    id: "frame-2",
    type: "frame" as const,
    className: "float-item float-drift-a left-[18%] bottom-[14%] h-10 w-10 text-slate-500/35",
    duration: 21,
    delay: -5,
  },
  {
    id: "flare-1",
    type: "flare" as const,
    className: "float-item float-drift-b left-[42%] top-[6%] h-9 w-9 text-sky-500/30",
    duration: 18,
    delay: -11,
  },
  {
    id: "flare-2",
    type: "flare" as const,
    className: "float-item float-drift-c right-[38%] bottom-[8%] h-8 w-8 text-blue-400/28",
    duration: 20,
    delay: -3,
  },
  {
    id: "node-1",
    type: "node" as const,
    className: "float-item float-drift-d left-[4%] top-[38%] h-10 w-10 text-indigo-600/32",
    duration: 23,
    delay: -8,
  },
  {
    id: "node-2",
    type: "node" as const,
    className: "float-item float-drift-a right-[6%] top-[48%] h-9 w-9 text-blue-600/28",
    duration: 17,
    delay: -6,
  },
  {
    id: "dot-1",
    type: "dot" as const,
    className: "float-item float-drift-b left-[55%] top-[22%] h-2 w-2 rounded-full bg-blue-500/40",
    duration: 15,
    delay: -1,
  },
  {
    id: "dot-2",
    type: "dot" as const,
    className: "float-item float-drift-c left-[72%] top-[65%] h-1.5 w-1.5 rounded-full bg-cyan-500/45",
    duration: 14,
    delay: -10,
  },
  {
    id: "dot-3",
    type: "dot" as const,
    className: "float-item float-drift-d left-[30%] bottom-[28%] h-2.5 w-2.5 rounded-full bg-indigo-400/35",
    duration: 16,
    delay: -4,
  },
  {
    id: "ring-lg",
    type: "ring" as const,
    className: "float-item float-spin-slow left-[58%] top-[72%] h-24 w-24 rounded-full border border-blue-400/20 bg-blue-400/5",
    duration: 40,
    delay: 0,
  },
  {
    id: "ring-sm",
    type: "ring" as const,
    className: "float-item float-drift-c left-[78%] top-[18%] h-14 w-14 rounded-full border border-indigo-300/25",
    duration: 28,
    delay: -12,
  },
  {
    id: "logo-1",
    type: "logo" as const,
    className: "float-item float-drift-b left-[68%] top-[38%] h-11 w-11 opacity-[0.14]",
    duration: 30,
    delay: -14,
  },
  {
    id: "logo-2",
    type: "logo" as const,
    className: "float-item float-drift-d left-[24%] top-[78%] h-9 w-9 opacity-[0.1]",
    duration: 27,
    delay: -7,
  },
] as const;

function FloaterIcon({ type }: { type: (typeof FLOATERS)[number]["type"] }) {
  switch (type) {
    case "lens":
      return <LensRing className="h-full w-full" />;
    case "aperture":
      return <Aperture className="h-full w-full" />;
    case "frame":
      return <FocusFrame className="h-full w-full" />;
    case "flare":
      return <ShutterFlare className="h-full w-full" />;
    case "node":
      return <DataNode className="h-full w-full" />;
    case "dot":
    case "ring":
      return null;
    case "logo":
      return (
        <div className="relative h-full w-full overflow-hidden rounded-xl ring-1 ring-blue-400/20">
          <Image
            src="/vektor-logo.png"
            alt=""
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
      );
  }
}

export function FloatingBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.08)_50%,transparent_100%)]" />

      {FLOATERS.map((item) => (
        <div
          key={item.id}
          className={item.className}
          style={
            {
              "--float-duration": `${item.duration}s`,
              "--float-delay": `${item.delay}s`,
            } as CSSProperties
          }
        >
          <FloaterIcon type={item.type} />
        </div>
      ))}
    </div>
  );
}
