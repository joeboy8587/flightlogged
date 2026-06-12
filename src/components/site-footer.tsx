import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t-4 border-ink bg-ink text-paper mt-24">
      <div className="max-w-[1400px] mx-auto px-4 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <h3 className="text-2xl mb-3">The Architecture of Never.</h3>
          <p className="text-sm max-w-md opacity-80">
            Civilian-led, AI-assisted airspace accountability. The machine watches,
            the math chooses, the record stands. Forever, and on the record.
          </p>
          <p className="mt-4 label-stamp text-warning">Watchtower 2.0 · Population-scale · Anti-bias by design</p>
          <p className="mt-3 text-sm">
            Contact: <a className="text-warning underline" href="mailto:watchtowerproject@proton.me">watchtowerproject@proton.me</a>
          </p>
          <ul className="mt-4 flex flex-wrap gap-3 text-xs label-stamp">
            <li><a className="underline hover:text-warning" href="https://github.com/watchtowerproject" rel="me noopener" target="_blank">GitHub</a></li>
            <li><a className="underline hover:text-warning" href="https://bsky.app/profile/advocacywatch.live" rel="me noopener" target="_blank">Bluesky</a></li>
            <li><a className="underline hover:text-warning" href="https://mastodon.social/@advocacywatch" rel="me noopener" target="_blank">Mastodon</a></li>
            <li><a className="underline hover:text-warning" href="/sitemap.xml">Sitemap</a></li>
            <li><a className="underline hover:text-warning" href="/llms.txt">llms.txt</a></li>
          </ul>
        </div>
        <div>
          <h4 className="label-stamp text-warning mb-3">The Work</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/live" className="hover:text-warning">Live Feed</Link></li>
            <li><Link to="/findings" className="hover:text-warning">Findings Archive</Link></li>
            <li><Link to="/methodology" className="hover:text-warning">Methodology</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="label-stamp text-warning mb-3">Get Involved</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/legal" className="hover:text-warning">Legal Protections</Link></li>
            <li><Link to="/act" className="hover:text-warning">Take Action</Link></li>
            <li><Link to="/about" className="hover:text-warning">About / Press</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/20">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3 label-stamp text-[10px] opacity-70">
          <span>© {new Date().getFullYear()} The Architecture of Never · Open Source · CC BY-SA 4.0</span>
          <span>SHA-256 · Merkle Chain · Bradford Hill · Chain of Custody</span>
        </div>
      </div>
    </footer>
  );
}