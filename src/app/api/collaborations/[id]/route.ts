import type { CollabStatus } from "@/lib/types";
import { body, route } from "@/lib/server/http";
import { HttpError, setCollaborationStatus } from "@/lib/server/db";
import { TRANSITIONS } from "@/lib/status";
import { clampText, positiveMoney } from "@/lib/server/safety";

// PATCH { status, counterFee?, counterNote? } → Collaboration (one Atlas write + history entry)
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const b = await body<{ status?: CollabStatus; counterFee?: number; counterNote?: string }>(req);
  if (!b.status || !(b.status in TRANSITIONS)) throw new HttpError(400, "Unknown status");
  return setCollaborationStatus(id, b.status, {
    counterFee: b.status === "countered" ? positiveMoney(b.counterFee, 10000) ?? undefined : undefined,
    counterNote: clampText(b.counterNote, 280)
  });
});
