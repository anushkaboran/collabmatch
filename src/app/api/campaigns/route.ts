import type { CampaignBrief } from "@/lib/types";
import { body, route } from "@/lib/server/http";
import { HttpError, insertCampaign, listCampaigns } from "@/lib/server/db";
import { clampText } from "@/lib/server/safety";

// POST { businessId, prompt, brief, briefSource? } → Campaign
export const POST = route(async req => {
  const b = await body<{ businessId?: string; prompt?: string; brief?: CampaignBrief; briefSource?: "gemini" | "heuristic" }>(req);
  if (!b.businessId || !b.brief) throw new HttpError(400, "businessId and brief are required");
  if (!(Number(b.brief.budget) > 0)) throw new HttpError(400, "Budget must be above $0");
  return insertCampaign({ businessId: b.businessId, prompt: clampText(b.prompt, 1500), brief: b.brief, briefSource: b.briefSource === "gemini" ? "gemini" : "heuristic" });
});

// GET ?businessId= → Campaign[]
export const GET = route(async req => {
  const businessId = new URL(req.url).searchParams.get("businessId");
  if (!businessId) throw new HttpError(400, "businessId is required");
  return listCampaigns(businessId);
});
