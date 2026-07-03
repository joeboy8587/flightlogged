import { Link } from "@tanstack/react-router";

export function BlogSidebar() {
  return (
    <aside className="brutal-border bg-paper p-5 space-y-6 text-sm">
      <div>
        <div className="label-stamp text-[11px] mb-2">The firewall</div>
        <p className="leading-snug">
          The machine doesn&rsquo;t have an opinion.{" "}
          <strong>We do.</strong> The ML core (Live Feed, Findings, Threat Index,
          Coordination, Operators) is untouched — statistical output only. This blog is
          where humans translate those findings into plain English with citations.
        </p>
      </div>
      <div>
        <div className="label-stamp text-[11px] mb-2">Verify any claim</div>
        <ul className="space-y-1">
          <li>
            <Link to="/methodology" className="underline hover:bg-warning">
              Methodology &amp; chain of custody
            </Link>
          </li>
          <li>
            <Link to="/live" className="underline hover:bg-warning">
              Raw Live Feed (quiet-math DB)
            </Link>
          </li>
          <li>
            <Link to="/citations" className="underline hover:bg-warning">
              Citations map
            </Link>
          </li>
          <li>
            <Link to="/operators" className="underline hover:bg-warning">
              Operators registry (FAA public)
            </Link>
          </li>
        </ul>
      </div>
      <div>
        <div className="label-stamp text-[11px] mb-2">Report an error</div>
        <p className="leading-snug">
          Every correction strengthens the record.{" "}
          <a
            href="mailto:watchtowerproject@proton.me?subject=Blog%20correction"
            className="underline"
          >
            Email us
          </a>{" "}
          the post slug and the claim in dispute.
        </p>
      </div>
    </aside>
  );
}