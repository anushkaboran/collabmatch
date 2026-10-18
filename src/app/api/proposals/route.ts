import { body, route } from "@/lib/server/http";
import { HttpError } from "@/lib/server/db";
import { proposalFor } from "@/lib/server/services";

// POST { campaignId, creatorId } → { proposal, source: "gemini" | "template" }
export const POST = route(async req => {
  const { campaignId, creatorId } = await body<{ campaignId?: string; creatorId?: string }>(req);
  if (!campaignId || !creatorId) throw new HttpError(400, "campaignId and creatorId are required");
  return proposalFor(campaignId, creatorId);
});
