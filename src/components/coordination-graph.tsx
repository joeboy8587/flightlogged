import { useMemo, useState } from "react";
import type { CoordinationRow } from "@/lib/watchtower.functions";

const ROLE_COLORS: Record<string, string> = {
  "Direct State Patrol": "hsl(0 85% 50%)",
  "Contractor State Function": "hsl(42 100% 55%)",
  "Enterprise Auxiliary": "hsl(0 0% 12%)",
  "Independent": "hsl(0 0% 70%)",
};

export function CoordinationGraph({ rows }: { rows: CoordinationRow[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const W = 900;
  const H = 600;
  const cx = W / 2;
  const cy = H / 2;

  // Filter to coordinating-ish rows; keep manageable
  const nodes = useMemo(() => {
    const sorted = [...rows]
      .filter((r) => r.coordinationScore > 0 || r.kernPriority)
      .sort((a, b) => b.coordinationScore - a.coordinationScore || b.detections - a.detections)
      .slice(0, 60);

    // Cluster by role: place each role group in its own angular wedge
    const groups: Record<string, CoordinationRow[]> = {};
    for (const r of sorted) {
      (groups[r.operationalRole] ||= []).push(r);
    }
    const roleOrder = ["Direct State Patrol", "Contractor State Function", "Enterprise Auxiliary", "Independent"];
    const present = roleOrder.filter((r) => groups[r]?.length);
    const wedge = (2 * Math.PI) / Math.max(present.length, 1);

    const positioned: Array<{
      r: CoordinationRow;
      x: number;
      y: number;
      radius: number;
      color: string;
    }> = [];

    present.forEach((role, gi) => {
      const list = groups[role];
      list.forEach((row, i) => {
        // Distance from center: more coordinated = closer
        const dist = 110 + (4 - row.coordinationScore) * 55;
        // Angle: wedge per group, spread within wedge
        const localAngle = (i + 1) / (list.length + 1);
        const angle = gi * wedge + wedge * localAngle - Math.PI / 2;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        const radius = 6 + Math.min(18, Math.sqrt(row.detections) / 2);
        positioned.push({ r: row, x, y, radius, color: ROLE_COLORS[role] ?? ROLE_COLORS.Independent });
      });
    });
    return positioned;
  }, [rows]);

  const hoveredNode = hover ? nodes.find((n) => n.r.icao === hover) : null;

  return (
    <div className="brutal-border-thick bg-paper">
      <div className="flex flex-wrap items-center gap-3 p-3 border-b-4 border-ink text-xs font-mono">
        <span className="label-stamp bg-ink text-paper px-2 py-0.5">Network view</span>
        {Object.entries(ROLE_COLORS).map(([role, color]) => (
          <span key={role} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
            {role}
          </span>
        ))}
        <span className="ml-auto opacity-60">Closer to center = higher coordination · Larger node = more detections</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block bg-paper" role="img" aria-label="Aircraft coordination network">
          {/* Concentric rings = coordination tiers */}
          {[0, 1, 2, 3].map((tier) => {
            const ringR = 110 + tier * 55;
            return (
              <circle
                key={tier}
                cx={cx}
                cy={cy}
                r={ringR}
                fill="none"
                stroke="hsl(0 0% 0% / 0.08)"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Edges from each node to the baseline center */}
          {nodes.map((n) => (
            <line
              key={`e-${n.r.icao}`}
              x1={cx}
              y1={cy}
              x2={n.x}
              y2={n.y}
              stroke={n.color}
              strokeOpacity={Math.max(0.08, n.r.coordinationScore / 5)}
              strokeWidth={hover === n.r.icao ? 2.5 : 1}
            />
          ))}

          {/* Central state-actor baseline */}
          <circle cx={cx} cy={cy} r={28} fill="hsl(0 0% 8%)" stroke="hsl(42 100% 55%)" strokeWidth={4} />
          <text x={cx} y={cy - 38} textAnchor="middle" className="font-mono" fontSize={11} fontWeight={700} fill="hsl(0 0% 8%)">
            STATE-ACTOR BASELINE
          </text>

          {/* Nodes */}
          {nodes.map((n) => (
            <g key={n.r.icao} onMouseEnter={() => setHover(n.r.icao)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
              <circle
                cx={n.x}
                cy={n.y}
                r={n.radius}
                fill={n.color}
                stroke={hover === n.r.icao ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)"}
                strokeWidth={hover === n.r.icao ? 3 : 1.5}
              />
              {(hover === n.r.icao || n.r.kernPriority) && (
                <text
                  x={n.x}
                  y={n.y + n.radius + 11}
                  textAnchor="middle"
                  fontSize={10}
                  className="font-mono"
                  fontWeight={700}
                  fill="hsl(0 0% 8%)"
                  pointerEvents="none"
                >
                  {n.r.registration || n.r.icao}
                </text>
              )}
            </g>
          ))}
        </svg>

        {hoveredNode && (
          <div className="absolute top-3 right-3 brutal-border bg-ink text-paper p-3 text-xs font-mono max-w-xs pointer-events-none">
            <div className="font-bold text-sm mb-1">{hoveredNode.r.registration || hoveredNode.r.icao}</div>
            {hoveredNode.r.registryOwner && <div className="opacity-80 mb-1">{hoveredNode.r.registryOwner}</div>}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
              <span className="opacity-60">Role</span><span>{hoveredNode.r.operationalRole}</span>
              <span className="opacity-60">Score</span><span>{hoveredNode.r.coordinationScore} / 4</span>
              <span className="opacity-60">Detections</span><span>{hoveredNode.r.detections.toLocaleString()}</span>
              <span className="opacity-60">Basis</span><span>{hoveredNode.r.classificationBasis}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}