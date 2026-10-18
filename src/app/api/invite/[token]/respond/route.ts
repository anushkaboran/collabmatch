import { body, route } from "@/lib/server/http";
import { getInviteView, HttpError, setCollaborationStatus } from "@/lib/server/db";
import { hasInstagram } from "@/lib/server/instagram";
import { claimForDemo } from "@/lib/server/services";
import { clampText, positiveMoney } from "@/lib/server/safety";

// POST { action: "accept" | "decline" | "counter", fee?, note? } → Collaboration
// Accepting or naming a fee needs a connected account; declining doesn't.
export const POST = route<{ params: Promise<{ token: string }> }>(async (req, { params }) => {
  const { token } = await params;
  const b = await body<{ action?: string; fee?: number; note?: string }>(req);
  const view = await getInviteView(token);
  if (b.action !== "decline" && !view.creator.claimed) {
    if (hasInstagram()) throw new HttpError(403, "Connect Instagram to answer this invite");
    await claimForDemo(view.creatorId);
  }
  if (b.action === "accept") return setCollaborationStatus(view.id, "accepted");
  if (b.action === "decline") return setCollaborationStatus(view.id, "declined");
  if (b.action === "counter") {
    const fee = positiveMoney(b.fee, 10000);
    if (!fee) throw new HttpError(400, "Enter a fee above $0");
    return setCollaborationStatus(view.id, "countered", { counterFee: fee, counterNote: clampText(b.note, 280) });
  }
  throw new HttpError(400, "action must be accept, decline or counter");
});
