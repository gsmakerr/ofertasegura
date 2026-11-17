type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const Logo = ({ className }: P) => (
  <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
    <rect width="512" height="512" rx="116" fill="#FFC933" />
    <g transform="rotate(-14 256 256)">
      <path d="M256 92 372 192V404H140V192Z" fill="#0E4D45" stroke="#0E4D45" strokeWidth="36" strokeLinejoin="round" />
      <circle cx="256" cy="178" r="22" fill="#FFC933" />
      <path d="M194 306 240 352 322 252" fill="none" stroke="#FFC933" strokeWidth="38" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);
export const IconSearch = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IconShield = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M12 3 4.5 6v5.5c0 4.5 3.1 8 7.5 9.5 4.4-1.5 7.5-5 7.5-9.5V6z" /><path d="m9 12 2.2 2.2L15.2 10" /></svg>
);
export const IconCheck = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base} strokeWidth={3}><path d="m5 12.5 4.5 4.5L19 7" /></svg>
);
export const IconAlert = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M12 4 2.5 20h19z" /><path d="M12 10v4.5M12 17.5v.01" /></svg>
);
export const IconDownload = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg>
);
export const IconShare = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M12 15V3m0 0L8 7m4-4 4 4M6 11H5v9h14v-9h-1" /></svg>
);
export const IconPlus = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8.5v7M8.5 12h7" /></svg>
);
export const IconClose = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconExternal = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M14 5h5v5M19 5l-8 8M11 6H6v12h12v-5" /></svg>
);
export const Spinner = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={`girando ${className || ""}`} aria-hidden="true" {...base} strokeWidth={3}><path d="M12 3a9 9 0 1 0 9 9" /></svg>
);
