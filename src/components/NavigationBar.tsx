import type { ReactNode } from "react";

type NavigationBarProps = {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onCancel: () => void;
  cancelDisabled?: boolean;
  cancelLabel?: string;
};

export function NavigationBar({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onCancel,
  cancelDisabled = false,
  cancelLabel = "İptal",
}: NavigationBarProps) {
  return (
    <nav
      className="mb-3 flex items-center gap-2"
      aria-label="Gezinme"
    >
      <NavButton
        label="Geri"
        onClick={onBack}
        disabled={!canGoBack}
        icon={<BackIcon />}
      />
      <NavButton
        label="İleri"
        onClick={onForward}
        disabled={!canGoForward}
        icon={<ForwardIcon />}
      />
      <button
        type="button"
        onClick={onCancel}
        disabled={cancelDisabled}
        className="ml-auto rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {cancelLabel}
      </button>
    </nav>
  );
}

function NavButton({
  label,
  onClick,
  disabled,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700"
    >
      {icon}
    </button>
  );
}

function BackIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ForwardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
