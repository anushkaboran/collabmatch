// Mock backend that implements the API contract in the browser (spec section 12.4).
// State lives in localStorage so a business tab and a creator tab in the same browser stay in sync.
// Simulated replies from other creators are stored as due times and applied lazily on each read.
import type { Campaign, CampaignBrief, Collaboration, CollaborationView, CollabStatus, Creator, MatchesResult, ParseResult, Platform } from "@/lib/types";
import { BUSINESSES, SEED_CREATORS, photoPost } from "./data";
import { draftProposal, estimateRate, optimize, parseCampaign, scoreCreator } from "@/lib/engine";

interface SimReply { collabId: string; at: number; action: "accept" | "counter"; fee?: number; note?: string }
interface DB { v: 1; creators: Creator[]; campaigns: Campaign[]; collaborations: Collaboration[]; sims: SimReply[] }

const KEY = "collabmatch-mock-db";
const fresh = (): DB => ({ v: 1, creators: structuredClone(SEED_CREATORS), campaigns: [], collaborations: [], sims: [] });
let memory: DB | null = null;

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch { /* storage blocked: fall back to memory */ }
  return memory ?? (memory = fresh());
}
function save(db: DB) {
  memory = db;
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ }
}
const id = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const wait = (ms = 450) => new Promise(r => setTimeout(r, ms));
const fail = (msg: string): never => { throw new Error(msg); };

/** Apply simulated creator replies whose time has come. */
function tick(db: DB) {
  const t = Date.now();
  const due = db.sims.filter(s => s.at <= t);
  if (!due.length) return false;
  for (const s of due) {
    const c = db.collaborations.find(x => x.id === s.collabId);
    if (!c || c.status !== "invited") continue;
    if (s.action === "accept") setStatus(c, "accepted");
    else { c.counterFee = s.fee; c.counterNote = s.note; setStatus(c, "countered"); }
    c.simulated = true;
  }
  db.sims = db.sims.filter(s => s.at > t);
  return true;
}
function setStatus(c: Collaboration, status: CollabStatus) {
  c.status = status; c.updatedAt = now(); c.history.push({ status, at: c.updatedAt });
}
function read(): DB { const db = load(); if (tick(db)) save(db); return db; }

function matchesFor(db: DB, campaign: Campaign): MatchesResult {
  const matches = db.creators.map(c => scoreCreator(c, campaign.brief)).sort((a, z) => Number(z.eligible) - Number(a.eligible) || z.score - a.score);
  return { matches, teams: optimize(matches, campaign.brief.budget) };
}
function view(db: DB, c: Collaboration): CollaborationView {
  const campaign = db.campaigns.find(x => x.id === c.campaignId)!;
  return { ...c, campaign, business: BUSINESSES.find(b => b.id === c.businessId)!, creator: db.creators.find(x => x.id === c.creatorId)! };
}

const TRANSITIONS: Record<CollabStatus, CollabStatus[]> = {
  invited: ["accepted", "declined", "countered"], countered: ["accepted", "invited"], accepted: ["in_progress"],
  in_progress: ["submitted"], submitted: ["completed"], declined: [], completed: []
};

export const mock = {
  async parseCampaign(prompt: string): Promise<ParseResult> { await wait(900); return { brief: parseCampaign(prompt), source: "heuristic" }; },

  async createCampaign(input: { businessId: string; prompt: string; brief: CampaignBrief; briefSource?: "gemini" | "heuristic" }): Promise<Campaign> {
    const db = read();
    const c: Campaign = { id: id(), ...input, status: "matched", briefSource: "heuristic", createdAt: now() };
    db.campaigns.unshift(c); save(db); return c;
  },
  async listCampaigns(businessId: string): Promise<Campaign[]> { await wait(200); return read().campaigns.filter(c => c.businessId === businessId); },
  async getCampaign(cid: string): Promise<{ campaign: Campaign; collaborations: CollaborationView[] }> {
    const db = read(); const campaign = db.campaigns.find(c => c.id === cid) ?? fail("Campaign not found");
    return { campaign, collaborations: db.collaborations.filter(c => c.campaignId === cid).map(c => view(db, c)) };
  },
  async updateCampaign(cid: string, brief: Partial<CampaignBrief>): Promise<Campaign> {
    const db = read(); const c = db.campaigns.find(x => x.id === cid) ?? fail("Campaign not found");
    c.brief = { ...c.brief, ...brief }; save(db); return c;
  },
  async getMatches(cid: string): Promise<MatchesResult> {
    const db = read(); const c = db.campaigns.find(x => x.id === cid) ?? fail("Campaign not found");
    return matchesFor(db, c);
  },
  async draftProposal(cid: string, creatorId: string): Promise<{ proposal: string }> {
    await wait(300);
    const db = read(); const camp = db.campaigns.find(x => x.id === cid) ?? fail("Campaign not found");
    const cr = db.creators.find(x => x.id === creatorId) ?? fail("Creator not found");
    const biz = BUSINESSES.find(b => b.id === camp.businessId)!;
    return { proposal: draftProposal(biz.name, biz.hood, camp.brief, cr, scoreCreator(cr, camp.brief)) };
  },
  async sendInvites(cid: string, invites: { creatorId: string; proposal: string; offeredFee: number }[]): Promise<Collaboration[]> {
    await wait(400);
    const db = read(); const camp = db.campaigns.find(x => x.id === cid) ?? fail("Campaign not found");
    const made = invites.map((inv, i): Collaboration => {
      const cr = db.creators.find(x => x.id === inv.creatorId)!;
      const t = now();
      const c: Collaboration = { id: id(), campaignId: cid, businessId: camp.businessId, creatorId: inv.creatorId, status: "invited", proposal: inv.proposal,
        compensation: inv.offeredFee, offeredFee: inv.offeredFee, inviteToken: id(), matchScore: scoreCreator(cr, camp.brief).score, createdAt: t, updatedAt: t, history: [{ status: "invited", at: t }] };
      // Simulate everyone except Maya (the creator we demo live) and creators added from social media.
      if (inv.creatorId !== "maya" && cr.dataSource !== "business") {
        const counter = inv.creatorId === "alex";
        db.sims.push({ collabId: c.id, at: Date.now() + 4000 + i * 3500, action: counter ? "counter" : "accept", fee: counter ? inv.offeredFee + 10 : undefined, note: counter ? "I'd add a carousel post" : undefined });
      }
      return c;
    });
    db.collaborations.push(...made); camp.status = "active"; save(db); return made;
  },
  async listCollaborations(q: { creatorId?: string; campaignId?: string }): Promise<CollaborationView[]> {
    const db = read();
    return db.collaborations.filter(c => (!q.creatorId || c.creatorId === q.creatorId) && (!q.campaignId || c.campaignId === q.campaignId)).map(c => view(db, c));
  },
  async updateCollaboration(cid: string, patch: { status: CollabStatus; counterFee?: number; counterNote?: string }): Promise<Collaboration> {
    const db = read(); const c = db.collaborations.find(x => x.id === cid) ?? fail("Invitation not found");
    if (!TRANSITIONS[c.status].includes(patch.status)) fail(`Can't go from ${c.status} to ${patch.status}`);
    if (patch.status === "countered") { c.counterFee = patch.counterFee; c.counterNote = patch.counterNote; }
    if (c.status === "countered" && patch.status === "accepted" && c.counterFee) { c.offeredFee = c.counterFee; c.compensation = c.counterFee; }
    if (c.status === "countered" && patch.status === "invited") { c.counterFee = undefined; c.counterNote = undefined; }
    setStatus(c, patch.status); save(db); return c;
  },
  async getCreator(cid: string): Promise<Creator> { return read().creators.find(c => c.id === cid) ?? fail("Creator not found"); },
  async updateCreator(cid: string, patch: Partial<Creator>): Promise<Creator> {
    const db = read(); const c = db.creators.find(x => x.id === cid) ?? fail("Creator not found");
    Object.assign(c, patch); save(db); return c;
  },
  async importCreator(input: { handle: string; platform: Platform; followers: number; notes: string; hood?: string }): Promise<Creator> {
    await wait(500);
    const db = read(); const parsed = parseCampaign(input.notes || "local");
    const handle = input.handle.startsWith("@") ? input.handle : `@${input.handle}`;
    const followers = input.followers || 2000;
    const keys = parsed.niches.includes("fitness") ? ["gym2", "gym4"] : parsed.niches.includes("fashion") ? ["beauty2", "travel1"] : ["cafe1", "food4"];
    const c: Creator = {
      id: `x${id()}`, name: handle.slice(1), handle, bio: input.notes, // real name unknown until they connect Instagram
      niches: parsed.niches, audienceTags: parsed.audienceTags, audienceAgeRange: [18, 34], location: "Seattle", hood: input.hood || "Seattle", serviceAreas: ["Seattle"],
      platforms: [input.platform], followers, contentStyles: ["short-form video"], rate: estimateRate(followers), available: true, avatarColor: "blue",
      dataSource: "business", verified: false, connectedPlatforms: [], socialUrl: `https://instagram.com/${handle.slice(1)}`,
      topPosts: keys.map(photoPost), rateType: "estimated", claimed: false
    };
    db.creators.push(c); save(db); return c;
  },
  async getInvite(token: string): Promise<CollaborationView> {
    const db = read(); const c = db.collaborations.find(x => x.inviteToken === token) ?? fail("This invite link isn't valid anymore");
    return view(db, c);
  },
  async respondInvite(token: string, action: "accept" | "decline" | "counter", fee?: number, note?: string): Promise<Collaboration> {
    const db = read(); const c = db.collaborations.find(x => x.inviteToken === token) ?? fail("This invite link isn't valid anymore");
    const status: CollabStatus = action === "accept" ? "accepted" : action === "decline" ? "declined" : "countered";
    if (action === "accept" || action === "counter") {
      const cr = db.creators.find(x => x.id === c.creatorId);
      if (cr && !cr.verified) Object.assign(cr, { verified: true, claimed: true, dataSource: "instagram", connectedPlatforms: ["instagram"], rateType: fee ? "quoted" : cr.rateType });
    }
    save(db);
    return mock.updateCollaboration(c.id, { status, counterFee: fee, counterNote: note });
  },
  async demoConnect(handle = "@maya.eats.sea"): Promise<Creator> {
    await wait(1200);
    const db = read(); const c = db.creators.find(x => x.handle === handle) ?? db.creators[0];
    c.lastSyncedAt = now(); save(db); return c;
  },
  async reset(): Promise<void> { save(fresh()); },
  /** Subscribe to changes made in other tabs. */
  subscribe(fn: () => void) {
    const h = (e: StorageEvent) => { if (e.key === KEY) fn(); };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }
};
