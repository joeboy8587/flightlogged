export function BlogBanner() {
  return (
    <div className="brutal-border-thick bg-warning text-ink p-4 sm:p-5 mb-8">
      <div className="label-stamp text-[11px] mb-1">ADVOCACY &amp; ANALYSIS — HUMAN-AUTHORED</div>
      <p className="text-sm sm:text-base leading-snug">
        The claims in this article are <strong>interpretations</strong> of the Watchtower
        system&rsquo;s objective findings. They do not represent the output of the
        non-biased machine-learning models. All underlying data is publicly available and
        independently verifiable via the{" "}
        <a href="/live" className="underline">Live Feed</a>,{" "}
        <a href="/findings" className="underline">Findings</a>,{" "}
        <a href="/coordination" className="underline">Coordination</a>, and{" "}
        <a href="/methodology" className="underline">Methodology</a> pages.
      </p>
    </div>
  );
}