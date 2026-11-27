import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { FlightReplayResult } from "./tracker";

const replayInput = z.object({
  tail: z.string().trim().toUpperCase().min(1).max(20).regex(/^[A-Z0-9-]+$/, "Enter a tail number or six-character aircraft code."),
  start: z.string().datetime({ offset: true }).optional(),
  end: z.string().datetime({ offset: true }).optional(),
}).superRefine((value, context) => {
  if (Boolean(value.start) !== Boolean(value.end)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Choose both a start and end time, or leave both empty." });
    return;
  }
  if (!value.start || !value.end) return;
  const start = new Date(value.start).getTime();
  const end = new Date(value.end).getTime();
  if (start >= end) context.addIssue({ code: z.ZodIssueCode.custom, message: "The replay end must be after its start." });
  if (end - start > 7 * 24 * 60 * 60 * 1000) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a replay window of seven days or less." });
  }
});

export const getFlightReplay = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => replayInput.parse(input))
  .handler(async ({ data }): Promise<FlightReplayResult | null> => {
    const { loadFlightReplay } = await import("./tracker.server");
    return loadFlightReplay(data);
  });
