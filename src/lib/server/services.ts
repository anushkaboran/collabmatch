// Business logic used by the routes: matching, proposals, invitations, imports.
import type { Campaign, Creator, MatchesResult, Platform } from "@/lib/types";
import { estimateRate, optimize, scoreCreator } from "@/lib/engine";
import { photoPost } from "@/mocks/data";
import * as db from "./db";
import { draftProposal, importCreatorTags } from "./gemini";
import { clampText, positiveMoney } from "./safety";

export const simulateReplies = () => process.env.DEMO_SIMULATED_REPLIES !== "false";

/** Atlas pre-filter → score every candidate → optimize teams within budget. */
export async function matchesFor(campaign: Campaign): Promise<MatchesResult> {
  const candidates = await db.prefilterCreators(campaign.brief);
  const matches = candidates.map(c => scoreCreator(c, campaign.brief))
    .sort((a, z) => Number(z.eligible) - Number(a.eligible) || z.score - a.score);
  return { matches, teams: optimize(matches, campaign.brief.budget) };
}

export async function proposalFor(campaignId: string, creatorId: string) {
  const campaign = await db.getCampaign(campaignId);
  const [creator, business] = await Promise.all([db.getCreator(creatorId), db.getBusiness(campaign.businessId)]);
  return draftProposal(business, campaign.brief, creator, scoreCreator(creator, campaign.brief));
}

export async function sendInvites(campaignId: string, invites: unknown) {
  if (!Array.isArray(invites) || invites.length === 0 || invites.length > 10) throw new db.HttpError(400, "Send 1 to 10 invites");
  const campaign = await db.getCampaign(campaignId);
  const existing = await db.listCollaborations({ campaignId });
  const rows = [];
  for (const raw of invites as Record<string, unknown>[]) {
    const creatorId = String(raw.creatorId ?? "");
    const fee = positiveMoney(raw.offeredFee, 10000);
    if (!fee) throw new db.HttpError(400, "Each invite needs a fee above $0");
    if (existing.some(e => e.creatorId === creatorId && e.status !== "declined")) continue; // already invited
    const creator = await db.getCreator(creatorId);
    const m = scoreCreator(creator, campaign.brief);
    if (!m.eligible) throw new db.HttpError(400, `${creator.name} can't be invited: ${m.ineligibleReason}`);
    let proposal = clampText(raw.proposal, 1200).trim();
    if (!proposal) proposal = (await proposalFor(campaignId, creatorId)).proposal;
    rows.push({ creatorId, proposal, offeredFee: fee, matchScore: m.score });
  }
  return db.insertCollaborations(campaignId, rows, simulateReplies());
}

export async function importCreator(input: Record<string, unknown>): Promise<Creator> {
  const raw = clampText(input.handle, 60).trim().replace(/\s+/g, "");
  if (!/^@?[A-Za-z0-9._]{1,30}$/.test(raw)) throw new db.HttpError(400, "Enter an Instagram or TikTok handle like @seattlesnacks");
  const handle = raw.startsWith("@") ? raw : `@${raw}`;
  const existing = await db.findCreatorByHandle(handle);
  if (existing) return existing;
  const followers = Math.min(Math.max(Math.round(Number(input.followers) || 2000), 0), 10_000_000);
  const notes = clampText(input.notes, 400);
  const platform: Platform = input.platform === "tiktok" ? "tiktok" : "instagram";
  const tags = await importCreatorTags(notes);
  const keys = tags.niches.includes("fitness") ? ["gym2", "gym4"] : tags.niches.includes("fashion") || tags.niches.includes("beauty") ? ["beauty2", "beauty3"] : tags.niches.includes("food") ? ["food2", "cafe1"] : ["cafe1", "cafe3"];
  const c: Creator = {
    id: `x${db.newId()}`, name: handle.slice(1), handle, bio: notes,
    niches: tags.niches, audienceTags: tags.audienceTags, audienceAgeRange: [18, 34],
    location: "Seattle", hood: "Seattle", serviceAreas: ["Seattle"], platforms: [platform], followers,
    contentStyles: ["short-form video"], rate: estimateRate(followers), rateType: "estimated", available: true, avatarColor: "blue",
    dataSource: "business", verified: false, connectedPlatforms: [], claimed: false,
    socialUrl: platform === "tiktok" ? `https://tiktok.com/${handle}` : `https://instagram.com/${handle.slice(1)}`,
    topPosts: keys.map(photoPost) // placeholder previews until they connect their account
  };
  return db.upsertCreator(c);
}

/** Demo stand-in when Instagram isn't configured: mark the creator as connected. */
export async function claimForDemo(creatorId: string) {
  const c = await db.getCreator(creatorId);
  if (c.verified && c.claimed) return c;
  return db.upsertCreator({ ...c, verified: true, claimed: true, dataSource: "instagram", connectedPlatforms: ["instagram"], lastSyncedAt: new Date().toISOString() });
}
