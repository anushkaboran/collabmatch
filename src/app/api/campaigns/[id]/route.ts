import type { CampaignBrief } from "@/lib/types";
import { body, route } from "@/lib/server/http";
import { getCampaign, listCollaborations, updateCampaignBrief } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };
const EDITABLE: (keyof CampaignBrief)[] = ["budget", "audienceTags", "niches", "platforms", "contentTypes", "title", "objective", "timeline", "location"];

// GET → { campaign, collaborations }
export const GET = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const [campaign, collaborations] = await Promise.all([getCampaign(id), listCollaborations({ campaignId: id })]);
  return { campaign, collaborations };
});

// PATCH partial brief (budget slider, chip edits) → Campaign
export const PATCH = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const patch = await body<Partial<CampaignBrief>>(req);
  const safe = Object.fromEntries(Object.entries(patch).filter(([k]) => EDITABLE.includes(k as keyof CampaignBrief))) as Partial<CampaignBrief>;
  if (safe.audienceTags) safe.targetAudience = safe.audienceTags.join(" and ");
  return updateCampaignBrief(id, safe);
});
