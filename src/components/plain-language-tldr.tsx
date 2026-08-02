export function PlainLanguageTLDR({
  dismissalsMonth,
}: {
  dismissalsMonth: number;
}) {
  return (
    <section className="border-b-4 border-ink bg-ink text-paper">
      <div className="max-w-[1400px] mx-auto px-4 py-16">
        <div className="label-stamp bg-paper text-ink inline-block px-2 py-1 mb-3">Plain English</div>
        <h2 className="text-4xl sm:text-5xl mb-6">What we do, in one minute</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
          <div className="brutal-border-thick border-paper p-5">
            <h3 className="text-xl mb-2 text-warning">The short version</h3>
            <p className="text-sm leading-relaxed">
              We point cameras and radios at the sky and record every aircraft that flies over
              Kern County. All of them. Not just the ones that look suspicious. Then a computer
              watches the recordings and learns what "normal" looks like for each county, each
              hour, each season. When something deviates from normal by a lot, it gets flagged.
              The math decides, not us.
            </p>
          </div>
          <div className="brutal-border-thick border-paper p-5">
            <h3 className="text-xl mb-2 text-warning">Why you can trust it</h3>
            <p className="text-sm leading-relaxed">
              Every record is sealed with a cryptographic hash and linked to the one before it,
              like a chain. If anyone changes a single record, the chain breaks and everyone can
              see it. You can verify any claim yourself using the{" "}
              <a href="/verify" className="underline text-warning">verification tool</a>. We also
              publish when we get it wrong: {dismissalsMonth} anomalies were dismissed after
              human review in the last 30 days.
            </p>
          </div>
        </div>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="brutal-border border-paper/40 p-4">
            <div className="label-stamp text-[11px] mb-1">Step 1</div>
            <p className="text-sm">Record every aircraft. All the time. No exceptions.</p>
          </div>
          <div className="brutal-border border-paper/40 p-4">
            <div className="label-stamp text-[11px] mb-1">Step 2</div>
            <p className="text-sm">Learn what normal looks like for 48 hours before flagging anything.</p>
          </div>
          <div className="brutal-border border-paper/40 p-4">
            <div className="label-stamp text-[11px] mb-1">Step 3</div>
            <p className="text-sm">Flag only what the math says is unusual. Publish the threshold.</p>
          </div>
        </div>
        <div className="mt-6">
          <a
            href="/api/public/export?format=csv"
            className="label-stamp bg-warning text-ink border-2 border-paper px-4 py-2 hover:bg-paper hover:text-ink transition-colors inline-block"
          >
            Download all scan data as CSV →
          </a>
        </div>
      </div>
    </section>
  );
}