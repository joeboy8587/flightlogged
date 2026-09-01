import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/master-report", label: "Master Report" },
  { to: "/how-to-read", label: "How to Read" },
  { to: "/accountability", label: "Accountability" },
  { to: "/surveillance-grid", label: "Surveillance Grid" },
  { to: "/live", label: "Live Feed" },
  { to: "/mosaic", label: "Mosaic" },
  { to: "/findings", label: "Findings" },
  { to: "/violations", label: "Violations" },
  { to: "/coordination", label: "Coordination" },
  { to: "/threat-index", label: "Threat Index" },
  { to: "/operators", label: "Operators" },
  { to: "/cases", label: "Cases" },
  { to: "/federal", label: "Federal Fleet" },
  { to: "/foreign", label: "Foreign" },
  { to: "/military", label: "Military" },
  { to: "/aircraft", label: "Aircraft Dossiers" },
  { to: "/tail-search", label: "Tail Search" },
  { to: "/ml-detections", label: "ML" },
  { to: "/podcasts", label: "Podcasts" },
  { to: "/blog", label: "Blog" },
  { to: "/citations", label: "Citations" },
  { to: "/reports", label: "Reports" },
  { to: "/rules", label: "Rules" },
  { to: "/toolkit", label: "Toolkit" },
  { to: "/methodology", label: "Methodology" },
  { to: "/verify", label: "Verify" },
  { to: "/legal", label: "Legal" },
  { to: "/act", label: "Take Action" },
  { to: "/about", label: "About" },
] as const;

// Primary nav shown on desktop; full list stays in the mobile/hamburger sheet.
const PRIMARY_NAV = [
  { to: "/", label: "Home" },
  { to: "/master-report", label: "Master Report" },
  { to: "/surveillance-grid", label: "Surveillance Grid" },
  { to: "/live", label: "Live Feed" },
  { to: "/findings", label: "Findings" },
  { to: "/reports", label: "Reports" },
  { to: "/methodology", label: "Methodology" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b-4 border-ink bg-paper sticky top-0 z-50">
      <div className="bg-ink text-paper px-4 py-1 flex items-center justify-between gap-2 text-[10px] label-stamp">
        <span className="flex items-center gap-2 min-w-0 truncate">
          <span className="inline-block w-2 h-2 bg-alert blink" aria-hidden /> WATCHTOWER 2.0 — BASELINE LEARNING
        </span>
        <span className="hidden md:inline shrink-0">CIVILIAN-LED · AI-ASSISTED · MATH-CHOSEN</span>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-6">
        <Link to="/" className="flex items-baseline gap-2 group min-w-0">
          <Mascot size="xs" className="self-center -mt-1" />
          <span className="text-base sm:text-2xl font-display uppercase leading-none truncate">
            The Architecture
          </span>
          <span className="text-base sm:text-2xl font-display uppercase leading-none bg-ink text-paper px-1.5 shrink-0">
            of Never
          </span>
        </Link>
        <nav className="hidden lg:flex items-center gap-1 flex-nowrap min-w-0">
          {PRIMARY_NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="label-stamp px-2 py-2 text-[11px] hover:bg-warning transition-colors whitespace-nowrap"
              activeProps={{ className: "label-stamp px-2 py-2 text-[11px] bg-ink text-paper whitespace-nowrap" }}
              suppressHydrationWarning
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/act"
            className="hidden sm:inline-flex label-stamp bg-warning text-ink brutal-border px-3 py-2 text-[11px] hover:bg-alert hover:text-paper transition-colors"
          >
            Deploy a Sensor →
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="brutal-border bg-paper p-2 hover:bg-warning transition-colors"
            >
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] sm:w-[380px] bg-paper text-ink p-0 overflow-y-auto">
              <SheetHeader className="px-4 py-3 border-b-4 border-ink flex-row items-center justify-between">
                <SheetTitle className="font-display uppercase text-lg">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col p-2">
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    activeOptions={{ exact: n.to === "/" }}
                    onClick={() => setOpen(false)}
                    className="label-stamp px-3 py-3 border-b border-ink/20 hover:bg-warning"
                    activeProps={{ className: "label-stamp px-3 py-3 border-b border-ink/20 bg-ink text-paper" }}
                    suppressHydrationWarning
                  >
                    {n.label}
                  </Link>
                ))}
                <Link
                  to="/act"
                  onClick={() => setOpen(false)}
                  className="label-stamp bg-warning text-ink brutal-border px-4 py-3 mt-3 mx-1 text-center"
                >
                  Deploy a Sensor →
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}