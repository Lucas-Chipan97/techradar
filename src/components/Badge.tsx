const tones = {
  neutral: "bg-cloud text-ink ring-line",
  brand: "bg-brand-soft text-brand-deep ring-brand/20",
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/10 text-warning ring-warning/25",
  danger: "bg-danger/10 text-danger ring-danger/20",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}
