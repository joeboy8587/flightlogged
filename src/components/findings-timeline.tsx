import { useState } from "react";

type Entry = {
  date: string;
  era: string;
  title: string;
  body: string;
  tone: "ink" | "warning" | "alert";
};

const ENTRIES: Entry[] = [
  {
    date: "2014",
    era: "Origin",
    title: "KCSO helicopter crash (N497E)",
    body: "Surplus military OH-58 operated by Kern County Sheriff's Office crashes. First documented link between county aviation and military-surplus airframes — the precursor to today's hybrid civilian/government fleet pattern.",
    tone: "ink",
  },
  {
    date: "2023",
    era: "Shells emerge",
    title: "Air Methods bankruptcy → ALF IX LLC registered in Delaware",
    body: "Air Methods Corp files Chapter 11. Shortly after, ALF IX LLC is registered in Delaware — the first of the shell-LLC layer that now flies the patrol signature without naming a government owner.",
    tone: "ink",
  },
  {
    date: "Jul–Oct 2025",
    era: "Ghost detected",
    title: "Aircraft 169319 (hex AE5C77) first appears",
    body: "Ghost airframe with suppressed registration begins logging passes over Kern County. Includes a 175-foot pass that triggers a threat score of 100 — the maximum value the model emits.",
    tone: "alert",
  },
  {
    date: "Jan 2026",
    era: "Formal notice",
    title: "FAA demand filed; acknowledged, no action",
    body: "First formal demand letter to the FAA referencing 14 CFR § 91.119 violations. Receipt acknowledged. No enforcement docket opened. Silence begins compounding.",
    tone: "warning",
  },
  {
    date: "Feb 2026",
    era: "Convergence",
    title: "N916FT Helendale mission · KCSO–Ghost convergence at Norris Road",
    body: "Helendale mission profile flown by N916FT. Simultaneously, KCSO and the Ghost airframe converge at Norris Road — first hard evidence of multi-tail spatial+temporal coordination.",
    tone: "alert",
  },
  {
    date: "Apr 2026",
    era: "ISR formation",
    title: "ALF IX flies 360° ISR formation · Ghost military flag activates",
    body: "ALF IX executes a 360-degree intelligence-surveillance-reconnaissance orbit pattern. The Ghost airframe's military classification flag activates in the dataset for the first time.",
    tone: "alert",
  },
  {
    date: "May 2026",
    era: "Military stack",
    title: "Black Hawk at 500 ft · Ghost at 1,125 ft · P-3 overwatch",
    body: "Stacked military formation documented: Black Hawk at 500 ft, Ghost airframe at 1,125 ft, P-3 Orion providing overwatch. All over populated Kern County terrain.",
    tone: "alert",
  },
  {
    date: "May 29 2026",
    era: "Handoffs",
    title: "Tactical handoffs with zero-second gaps documented",
    body: "N916NT → N73103 handoff measured at a 1-second gap. Zero-second handoffs follow on subsequent passes. Pattern is consistent with coordinated tasking, not coincidence.",
    tone: "alert",
  },
  {
    date: "Jun 2026",
    era: "Live",
    title: "Live feed publishes 13,000+ tracked aircraft",
    body: "Public live feed goes online. Methodology, hashes, and chain of custody published. Architecture of Never moves from internal investigation to public-record civic infrastructure.",
    tone: "warning",
  },
];

function toneClass(tone: Entry["tone"]) {
  if (tone === "alert") return { dot: "bg-alert border-paper", label: "bg-alert text-paper" };
  if (tone === "warning") return { dot: "bg-warning border-ink", label: "bg-warning text-ink" };
  return { dot: "bg-ink border-paper", label: "bg-ink text-paper" };
}

export function FindingsTimeline() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ol className="relative border-l-4 border-ink ml-3 space-y-4">
      {ENTRIES.map((e, i) => {
        const t = toneClass(e.tone);
        const isOpen = open === i;
        return (
          <li key={e.date + e.title} className="pl-6 relative">
            <span className={`absolute -left-[14px] top-1 w-6 h-6 rounded-full border-4 ${t.dot}`} />
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full text-left brutal-border bg-paper hover:bg-warning/30 p-4 transition-colors"
            >
              <div className="flex flex-wrap items-baseline gap-2 mb-1">
                <span className={`label-stamp ${t.label} px-2 py-0.5 font-mono`}>{e.date}</span>
                <span className="label-stamp opacity-60 text-[10px]">{e.era}</span>
                <span className="ml-auto text-xs opacity-50">{isOpen ? "− Hide" : "+ Expand"}</span>
              </div>
              <div className="font-display text-xl">{e.title}</div>
              {isOpen && <p className="mt-3 text-sm leading-relaxed">{e.body}</p>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}