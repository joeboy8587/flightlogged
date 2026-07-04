import { createFileRoute } from "@tanstack/react-router";
import { getLatestScan } from "@/lib/scans.functions";

export const Route = createFileRoute("/api/public/scans/latest")({
  server: {
    handlers: {
      GET: async () => {
        const scan = await getLatestScan();
        return new Response(JSON.stringify({ scan }, null, 2), {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=30",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});