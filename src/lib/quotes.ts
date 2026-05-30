export type Quote = {
  text: string;
  source: string;
  cite?: string;
};

export const QUOTES: Quote[] = [
  { text: "Two agencies. Same city. Same mandate. Opposite results.", source: "Watchtower Project — BPD vs. KCSO Comparison", cite: "May 2026" },
  { text: "The reforms are achievable. The timeline is reasonable. The requirements are constitutional, not punitive.", source: "Watchtower Project — BPD vs. KCSO Comparison", cite: "May 2026" },
  { text: "BPD is not a model department. But BPD is proof that the model is achievable.", source: "Watchtower Project — BPD vs. KCSO Comparison", cite: "May 2026" },
  { text: "The problem is not the reform requirements. The problem is institutional will.", source: "Watchtower Project — BPD vs. KCSO Comparison", cite: "May 2026" },
  { text: "KCSO spent $4.1M per year on aerial surveillance while claiming a staffing crisis.", source: "Watchtower Project — Budget Comparison", cite: "FY 2024–2026" },
  { text: "Three killed in 8 days, immediately following a two-year DOJ extension granted over KCSO's objection.", source: "Watchtower Project — Reform Compliance Findings", cite: "April 2026" },
  { text: "Body-worn camera does not capture everything the deputy sees, and vice-versa.", source: "KCSO Critical Incident Release — Porterville", cite: "April 9, 2026" },
  { text: "Use of a BearCat as a deadly weapon falls outside constitutional limits under Graham v. Connor.", source: "KCSO Comprehensive Audit", cite: "Watchtower Project" },
  { text: "Internal review is designed to exonerate: same chain of command, same officers, same policies.", source: "The Architecture of Never: 2005–2026", cite: "Watchtower Project" },
  { text: "54 of 54 fatal shootings ruled justified between 2005 and 2015.", source: "Watchtower Project — Historical Record", cite: "Public record" },
  { text: "You are not invisible. You are the signal.", source: "Watchtower Project", cite: "Joseph Nipper" },
  { text: "All data we publish is drawn from public sources and is independently verifiable by any member of the public.", source: "Watchtower Methodology" },
];

export function pickQuote(seed: string): Quote {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return QUOTES[h % QUOTES.length];
}
