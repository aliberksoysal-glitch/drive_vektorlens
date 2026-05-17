import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "bg-blue-800 text-white hover:bg-blue-900 focus-visible:ring-blue-800/30 disabled:bg-slate-300 disabled:text-slate-500",
  secondary:
    "border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400/20 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400",
  ghost:
    "bg-transparent text-blue-800 hover:bg-blue-50 hover:text-blue-900 focus-visible:ring-blue-800/20 disabled:text-slate-400",
  neutral:
    "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-slate-400/20",
  danger:
    "bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700/30 disabled:bg-slate-300 disabled:text-slate-500",
} as const;

const sizes = {
  sm: "min-h-9 px-3 py-2 text-xs",
  md: "min-h-11 px-4 py-2.5 text-sm",
  lg: "min-h-12 px-5 py-3 text-base",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  fullWidth?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2",
        "disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
