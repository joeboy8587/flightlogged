import { pickQuote, type Quote } from "@/lib/quotes";

type Props = {
  seed?: string;
  quote?: Quote;
  variant?: "default" | "alert" | "inverse";
  className?: string;
};

export function PullQuote({ seed = "default", quote, variant = "default", className = "" }: Props) {
  const q = quote ?? pickQuote(seed);
  const tone =
    variant === "alert"
      ? "bg-alert text-paper border-ink"
      : variant === "inverse"
      ? "bg-ink text-paper border-warning"
      : "bg-paper text-ink border-ink";
  return (
    <figure className={`brutal-border-thick ${tone} p-6 sm:p-8 my-10 max-w-3xl ${className}`}>
      <div className="label-stamp opacity-70 mb-3">From the record</div>
      <blockquote className="font-display text-2xl sm:text-3xl leading-tight uppercase tracking-tight">
        &ldquo;{q.text}&rdquo;
      </blockquote>
      <figcaption className="label-stamp mt-4 opacity-80">
        — {q.source}{q.cite ? ` · ${q.cite}` : ""}
      </figcaption>
    </figure>
  );
}
