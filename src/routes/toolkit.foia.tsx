import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { breadcrumbScript } from "@/lib/breadcrumbs";

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Toolkit", href: "/toolkit" },
  { label: "FOIA / CPRA Builder" },
];

export const Route = createFileRoute("/toolkit/foia")({
  head: () => ({
    meta: [
      { title: "FOIA / CPRA Request Builder - Watchtower Toolkit" },
      { name: "description", content: "Generate a formatted, legally-cited FOIA or CPRA public records request in five minutes. Free, runs entirely in your browser." },
      { property: "og:title", content: "FOIA / CPRA Request Builder" },
      { property: "og:description", content: "Five minutes to a ready-to-send public records request." },
      { property: "og:url", content: "https://flightlogged.lovable.app/toolkit/foia" },
    ],
    links: [{ rel: "canonical", href: "https://flightlogged.lovable.app/toolkit/foia" }],
    scripts: [breadcrumbScript(crumbs)],
  }),
  component: FoiaBuilder,
});

type RequestType = "federal-foia" | "ca-cpra" | "faa" | "local";

type Agency = { value: string; label: string; address: string };

const AGENCIES: Record<RequestType, Agency[]> = {
  "federal-foia": [
    { value: "fbi", label: "FBI", address: "FBI Record/Information Dissemination Section\n170 Marcel Drive\nWinchester, VA 22602-4843" },
    { value: "dhs", label: "Department of Homeland Security", address: "Privacy Office, Mail Stop 0655\nDepartment of Homeland Security\n2707 Martin Luther King Jr. Ave SE\nWashington, DC 20528-0655" },
    { value: "doj", label: "Department of Justice", address: "Office of Information Policy\nDepartment of Justice\n441 G Street NW, 6th Floor\nWashington, DC 20530" },
  ],
  "faa": [
    { value: "faa-hq", label: "FAA Headquarters FOIA Office", address: "Federal Aviation Administration\nFOIA Requester Service Center, AGC-300\n800 Independence Avenue SW\nWashington, DC 20591" },
    { value: "faa-fs", label: "FAA Flight Standards Service", address: "FAA Flight Standards Service\nAFS-1, 800 Independence Avenue SW\nWashington, DC 20591" },
  ],
  "ca-cpra": [
    { value: "kcso", label: "Kern County Sheriff's Office", address: "Kern County Sheriff's Office\nRecords Bureau\n1350 Norris Road\nBakersfield, CA 93308" },
    { value: "lapd", label: "Los Angeles Police Department", address: "LAPD Discovery Section\nP.O. Box 30158\nLos Angeles, CA 90030" },
    { value: "lasd", label: "Los Angeles County Sheriff's Department", address: "LASD Office of Constitutional Policing\n4700 Ramona Boulevard\nMonterey Park, CA 91754" },
    { value: "chp", label: "California Highway Patrol", address: "California Highway Patrol\nP.O. Box 942898\nSacramento, CA 94298-0001" },
  ],
  "local": [
    { value: "custom", label: "Other / custom agency (you fill in)", address: "" },
  ],
};

const STATUTE: Record<RequestType, { law: string; cite: string; deadline: string }> = {
  "federal-foia": { law: "Freedom of Information Act", cite: "5 U.S.C. \u00a7 552", deadline: "20 business days" },
  "faa":          { law: "Freedom of Information Act", cite: "5 U.S.C. \u00a7 552", deadline: "20 business days" },
  "ca-cpra":      { law: "California Public Records Act", cite: "Cal. Gov. Code \u00a7 7920.000 et seq.", deadline: "10 calendar days" },
  "local":        { law: "applicable state public records law", cite: "(see your state statute)", deadline: "statutory response window" },
};

const RECORD_CHECKLIST = [
  "Aircraft registration and ownership history",
  "LADD / PIA privacy program status",
  "Flight logs and ATC communications",
  "Operating certificates (Part 135 / Part 91K)",
  "Low-altitude waivers and Certificates of Authorization (COAs)",
  "Hangar / ramp agreements at named airport",
  "MOUs with private aviation companies",
  "AB 481 military equipment use policy (California only)",
  "Annual reporting under DPPM J-4000",
  "Contracts with named entity",
];

function FoiaBuilder() {
  const [type, setType] = useState<RequestType>("ca-cpra");
  const [agency, setAgency] = useState<string>("kcso");
  const [customAgency, setCustomAgency] = useState<string>("");
  const [customAddress, setCustomAddress] = useState<string>("");
  const [tail, setTail] = useState<string>("");
  const [entity, setEntity] = useState<string>("");
  const [airport, setAirport] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [requesterName, setRequesterName] = useState<string>("");
  const [requesterEmail, setRequesterEmail] = useState<string>("");
  const [feeWaiver, setFeeWaiver] = useState<boolean>(true);

  const agencies = AGENCIES[type];
  const selectedAgency: Agency | undefined = useMemo(
    () => agencies.find((a) => a.value === agency),
    [agencies, agency],
  );

  const law = STATUTE[type];

  function toggle(item: string) {
    setChecked((c) => ({ ...c, [item]: !c[item] }));
  }

  const letter = useMemo(() => {
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const agencyName = agency === "custom" ? (customAgency || "[AGENCY NAME]") : (selectedAgency?.label ?? "[AGENCY NAME]");
    const agencyAddress = agency === "custom" ? (customAddress || "[AGENCY ADDRESS]") : (selectedAgency?.address ?? "[AGENCY ADDRESS]");

    const requested: string[] = [];
    RECORD_CHECKLIST.forEach((item) => { if (checked[item]) requested.push(item); });
    if (tail) requested.push(`All records relating to aircraft tail number ${tail.toUpperCase()}, including ownership, flight authorizations, and any complaints filed`);
    if (entity) requested.push(`All contracts, MOUs, and correspondence between your agency and ${entity}`);
    if (airport) requested.push(`All hangar / ramp / lease agreements at ${airport}`);

    const dateClause = (dateFrom || dateTo)
      ? `\n\nTime period: ${dateFrom || "[earliest available]"} through ${dateTo || "present"}.`
      : "";

    const feeClause = feeWaiver
      ? `\n\nFee waiver request: I request a waiver of all fees under the public-interest standard. Disclosure of the requested records is in the public interest because it is likely to contribute significantly to public understanding of the operations or activities of government, and it is not primarily in my commercial interest.`
      : "";

    const items = requested.length > 0
      ? requested.map((r, i) => `   ${i + 1}. ${r}`).join("\n")
      : "   [No specific record categories selected — add at least one before sending.]";

    return [
      `${today}`,
      ``,
      `${agencyName}`,
      `${agencyAddress}`,
      ``,
      `Re: ${law.law} Request — ${tail ? `Aircraft ${tail.toUpperCase()}` : entity ? `Records concerning ${entity}` : `Aerial surveillance records`}`,
      ``,
      `To Whom It May Concern:`,
      ``,
      `Pursuant to ${law.cite}, I request copies of the following records:${dateClause}`,
      ``,
      items,
      ``,
      `If any portion of this request is denied, please cite the specific exemption relied upon and segregate and release any non-exempt portions of responsive records.`,
      ``,
      `Please provide responsive records in electronic format (PDF or native digital) where possible. I am willing to receive records on a rolling basis as they are processed.${feeClause}`,
      ``,
      `I expect a response within ${law.deadline} as required by ${law.cite}. If you anticipate delay, please contact me in writing with an estimated completion date.`,
      ``,
      `Thank you for your time. I appreciate your prompt attention to this request.`,
      ``,
      `Sincerely,`,
      ``,
      `${requesterName || "[Your Name]"}`,
      `${requesterEmail || "[Your Email]"}`,
      ``,
      `---`,
      `Generated by Watchtower Toolkit — https://flightlogged.lovable.app/toolkit/foia`,
      `This request was drafted client-side. No data was transmitted to any server.`,
    ].join("\n");
  }, [type, agency, customAgency, customAddress, selectedAgency, tail, entity, airport, dateFrom, dateTo, checked, requesterName, requesterEmail, feeWaiver, law]);

  function download() {
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `records-request-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(letter);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SiteBreadcrumbs items={crumbs} />

      <section className="border-b-4 border-ink bg-ink text-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="label-stamp text-warning mb-3">Toolkit · Tool 01</div>
          <h1 className="text-4xl sm:text-6xl mb-3">FOIA / CPRA Builder.</h1>
          <p className="max-w-3xl opacity-80 text-sm">
            Fill in the fields. A formatted, legally-cited records request is generated in your
            browser. Download as text, copy to clipboard, paste into an email. Nothing you type here
            is sent to any server.
          </p>
        </div>
      </section>

      <section className="border-b-4 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 py-12 grid lg:grid-cols-2 gap-8">
          {/* FORM */}
          <div className="space-y-6">
            <div>
              <label className="label-stamp block mb-2">Request type</label>
              <select
                value={type}
                onChange={(e) => {
                  const next = e.target.value as RequestType;
                  setType(next);
                  setAgency(AGENCIES[next][0]?.value ?? "custom");
                }}
                className="w-full brutal-border px-3 py-2 bg-paper font-mono text-sm"
              >
                <option value="federal-foia">Federal FOIA (5 USC 552)</option>
                <option value="faa">FAA-specific FOIA</option>
                <option value="ca-cpra">California Public Records Act</option>
                <option value="local">Other local / state agency</option>
              </select>
            </div>

            <div>
              <label className="label-stamp block mb-2">Target agency</label>
              <select
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                className="w-full brutal-border px-3 py-2 bg-paper font-mono text-sm"
              >
                {agencies.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            {agency === "custom" && (
              <div className="space-y-3">
                <div>
                  <label className="label-stamp block mb-2">Agency name</label>
                  <input value={customAgency} onChange={(e) => setCustomAgency(e.target.value)} className="w-full brutal-border px-3 py-2 bg-paper font-mono text-sm" placeholder="e.g., Bakersfield Police Department" />
                </div>
                <div>
                  <label className="label-stamp block mb-2">Agency mailing address</label>
                  <textarea value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} rows={3} className="w-full brutal-border px-3 py-2 bg-paper font-mono text-sm" placeholder="Street, City, State, ZIP" />
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label-stamp block mb-2">Aircraft tail # (optional)</label>
                <input value={tail} onChange={(e) => setTail(e.target.value)} className="w-full brutal-border px-3 py-2 bg-paper font-mono text-sm" placeholder="N12345" />
              </div>
              <div>
                <label className="label-stamp block mb-2">Entity / operator (optional)</label>
                <input value={entity} onChange={(e) => setEntity(e.target.value)} className="w-full brutal-border px-3 py-2 bg-paper font-mono text-sm" placeholder="KCSI AERIAL PATROL INC" />
              </div>
              <div>
                <label className="label-stamp block mb-2">Airport (optional)</label>
                <input value={airport} onChange={(e) => setAirport(e.target.value)} className="w-full brutal-border px-3 py-2 bg-paper font-mono text-sm" placeholder="Meadows Field (BFL)" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label-stamp block mb-2">From</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full brutal-border px-3 py-2 bg-paper font-mono text-sm" />
                </div>
                <div>
                  <label className="label-stamp block mb-2">To</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full brutal-border px-3 py-2 bg-paper font-mono text-sm" />
                </div>
              </div>
            </div>

            <div>
              <label className="label-stamp block mb-2">Records sought (check all that apply)</label>
              <div className="brutal-border p-3 space-y-2 max-h-64 overflow-y-auto bg-paper">
                {RECORD_CHECKLIST.map((item) => (
                  <label key={item} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-warning/30 p-1">
                    <input type="checkbox" checked={!!checked[item]} onChange={() => toggle(item)} className="mt-1" />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label-stamp block mb-2">Your name</label>
                <input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} className="w-full brutal-border px-3 py-2 bg-paper font-mono text-sm" placeholder="Jane Public" />
              </div>
              <div>
                <label className="label-stamp block mb-2">Your email</label>
                <input type="email" value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} className="w-full brutal-border px-3 py-2 bg-paper font-mono text-sm" placeholder="jane@example.com" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={feeWaiver} onChange={(e) => setFeeWaiver(e.target.checked)} />
              <span>Include public-interest fee-waiver request</span>
            </label>
          </div>

          {/* PREVIEW */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="label-stamp">Preview · {law.law}</div>
              <div className="flex gap-2">
                <button onClick={copy} className="label-stamp brutal-border px-3 py-2 bg-paper hover:bg-warning text-xs">Copy</button>
                <button onClick={download} className="label-stamp brutal-border px-3 py-2 bg-warning hover:bg-alert hover:text-paper text-xs">Download .txt</button>
              </div>
            </div>
            <pre className="brutal-border-thick p-4 bg-paper text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[700px] overflow-y-auto">
{letter}
            </pre>
            <p className="mt-3 text-xs opacity-60 font-mono">
              This letter is generated entirely in your browser. Your inputs are not transmitted
              anywhere. Review for accuracy before sending. This tool is not legal advice.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 py-10 flex flex-wrap gap-3">
          <Link to="/toolkit" className="label-stamp brutal-border px-5 py-3 hover:bg-warning">&larr; Back to Toolkit</Link>
          <Link to="/violations" className="label-stamp brutal-border px-5 py-3 hover:bg-warning">See violations log</Link>
          <Link to="/act" className="label-stamp brutal-border px-5 py-3 bg-ink text-paper hover:bg-alert">Take action</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}