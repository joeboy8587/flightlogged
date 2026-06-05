import { Link } from "@tanstack/react-router";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/how-to-read", label: "How to Read" },
  { to: "/live", label: "Live Feed" },
  { to: "/findings", label: "Findings" },
  { to: "/violations", label: "Violations" },
  { to: "/coordination", label: "Coordination" },
  { to: "/threat-index", label: "Threat Index" },
  { to: "/operators", label: "Operators" },
  { to: "/ml-detections", label: "ML" },
  { to: "/citations", label: "Citations" },
  { to: "/reports", label: "Reports" },
  { to: "/rules", label: "Rules" },
  { to: "/methodology", label: "Methodology" },
  { to: "/legal", label: "Legal" },
  { to: "/act", label: "Take Action" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b-4 border-ink bg-paper sticky top-0 z-50">
      <div className="bg-ink text-paper px-4 py-1 flex items-center justify-between text-[10px] label-stamp">
        <span className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-alert blink" aria-hidden /> WATCHTOWER 2.0 — BASELINE LEARNING
        </span>
        <span className="hidden sm:inline">CIVILIAN-LED · AI-ASSISTED · MATH-CHOSEN</span>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 py-4 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-baseline gap-2 group">
          <span className="text-xl sm:text-2xl font-display uppercase leading-none">
            The Architecture
          </span>
          <span className="text-xl sm:text-2xl font-display uppercase leading-none bg-ink text-paper px-1.5">
            of Never
          </span>
        </Link>
        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="label-stamp px-3 py-2 hover:bg-warning transition-colors"
              activeProps={{ className: "label-stamp px-3 py-2 bg-ink text-paper" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/act"
          className="hidden md:inline-flex label-stamp bg-warning text-ink brutal-border px-4 py-2 hover:bg-alert hover:text-paper transition-colors"
        >
          Deploy a Sensor →
        </Link>
      </div>
      <nav className="lg:hidden border-t-2 border-ink px-4 py-2 flex gap-1 overflow-x-auto">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === "/" }}
            className="label-stamp px-2 py-1 whitespace-nowrap"
            activeProps={{ className: "label-stamp px-2 py-1 whitespace-nowrap bg-ink text-paper" }}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}