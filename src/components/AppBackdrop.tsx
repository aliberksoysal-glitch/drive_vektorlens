/**
 * Sabit arka plan katmanı: hafif mavimsi sis + yavaş süzülen uygulama temalı ikonlar.
 * pointer-events: none — tıklamaları engellemez.
 */
export function AppBackdrop() {
  return (
    <div className="app-backdrop" aria-hidden>
      <div className="app-backdrop__wash" />
      <div className="app-backdrop__glow app-backdrop__glow--tl" />
      <div className="app-backdrop__glow app-backdrop__glow--br" />
      <div className="app-backdrop__icons">
        <span className="app-backdrop__icon app-backdrop__float app-backdrop__float--a">
          <IconFolder />
        </span>
        <span className="app-backdrop__icon app-backdrop__float app-backdrop__float--b">
          <IconCamera />
        </span>
        <span className="app-backdrop__icon app-backdrop__float app-backdrop__float--c">
          <IconCloudUp />
        </span>
        <span className="app-backdrop__icon app-backdrop__float app-backdrop__float--d">
          <IconImage />
        </span>
        <span className="app-backdrop__icon app-backdrop__float app-backdrop__float--e">
          <IconLens />
        </span>
        <span className="app-backdrop__icon app-backdrop__float app-backdrop__float--f">
          <IconGrid />
        </span>
        <span className="app-backdrop__icon app-backdrop__float app-backdrop__float--g">
          <IconFolder />
        </span>
        <span className="app-backdrop__icon app-backdrop__float app-backdrop__float--h">
          <IconCamera />
        </span>
      </div>
    </div>
  );
}

function iconClass() {
  return "h-full w-full text-[var(--backdrop-icon)]";
}

function IconFolder() {
  return (
    <svg className={iconClass()} fill="none" stroke="currentColor" strokeWidth="1.35" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7.5V6a2 2 0 012-2h4.172a2 2 0 011.414.586l1.414 1.414A2 2 0 0114.828 7H19a2 2 0 012 2v8.5a2 2 0 01-2 2H5a2 2 0 01-2-2V7.5z"
      />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg className={iconClass()} fill="none" stroke="currentColor" strokeWidth="1.35" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

function IconCloudUp() {
  return (
    <svg className={iconClass()} fill="none" stroke="currentColor" strokeWidth="1.35" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function IconImage() {
  return (
    <svg className={iconClass()} fill="none" stroke="currentColor" strokeWidth="1.35" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 5.25A2.25 2.25 0 016.25 3h11.5A2.25 2.25 0 0120 5.25v13.5A2.25 2.25 0 0117.75 21H6.25A2.25 2.25 0 014 18.75V5.25z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 10.5a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25zM9 15l2.25-2.25L15 16.5" />
    </svg>
  );
}

function IconLens() {
  return (
    <svg className={iconClass()} fill="none" stroke="currentColor" strokeWidth="1.35" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3.75" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2.25v2.25M12 19.5v2.25M2.25 12h2.25M19.5 12h2.25M4.4 4.4l1.59 1.59M18.01 18.01l1.59 1.59M4.4 19.6l1.59-1.59M18.01 5.99l1.59-1.59"
      />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg className={iconClass()} fill="none" stroke="currentColor" strokeWidth="1.35" viewBox="0 0 24 24">
      <path strokeLinecap="round" d="M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z" />
    </svg>
  );
}
