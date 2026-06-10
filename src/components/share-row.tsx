import { useState } from "react";
import { Share2, Check } from "lucide-react";

export function ShareRow({ text, label = "Share" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function onClick() {
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ text, title: "Watchtower finding" });
        return;
      }
    } catch {/* fall through to copy */}
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {/* ignore */}
  }
  return (
    <button
      onClick={onClick}
      type="button"
      aria-label={label}
      className="inline-flex items-center gap-1 brutal-border px-2 py-1 label-stamp text-[10px] bg-paper hover:bg-warning transition-colors"
    >
      {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Share2 className="w-3 h-3" /> Share</>}
    </button>
  );
}