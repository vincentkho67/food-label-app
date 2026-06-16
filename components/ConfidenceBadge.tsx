import type { Confidence } from "@/lib/types";

const LEVELS: Record<Confidence, { text: string; color: string; dot: string }> = {
  high: { text: "High confidence", color: "text-accent", dot: "bg-accent" },
  medium: { text: "Est. confidence", color: "text-warn", dot: "bg-warn" },
  low: { text: "Low confidence", color: "text-bad", dot: "bg-bad" },
};

export function ConfidenceBadge({
  level,
  className = "",
}: {
  level: Confidence;
  className?: string;
}) {
  const c = LEVELS[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] ${c.color} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${c.dot}`} aria-hidden />
      {c.text}
    </span>
  );
}
