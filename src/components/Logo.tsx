/** Marque : un balayage radar stylisé. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <path d="M16 16 L16 2 A14 14 0 0 1 28.1 9 Z" fill="currentColor" opacity="0.9" />
      <circle cx="21.5" cy="10.5" r="2.2" fill="#fff" />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
    </svg>
  );
}
