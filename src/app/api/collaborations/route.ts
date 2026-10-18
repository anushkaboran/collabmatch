import { body, route } from "@/lib/server/http";
import { HttpError, listCollaborations } from "@/lib/server/db";
import { sendInvites } from "@/lib/server/services";

// POST { campaignId, invites: [{ creatorId, proposal, offeredFee }] } → Collaboration[]
export const POST = route(async req => {
  const { campaignId, invites } = await body<{ campaignId?: string; invites?: unknown }>(req);
  if (!campaignId) throw new HttpError(400, "campaignId is required");
  return sendInvites(campaignId, invites);
});

// GET ?creatorId= or ?campaignId= → CollaborationView[] (campaign, business, creator joined)
export const GET = route(async req => {
  const q = new URL(req.url).searchParams;
  return listCollaborations({ creatorId: q.get("creatorId") ?? undefined, campaignId: q.get("campaignId") ?? undefined });
});
