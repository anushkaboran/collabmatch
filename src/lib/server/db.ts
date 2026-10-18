// Repository: every read/write the API needs (spec 11.2). Uses MongoDB Atlas when MONGODB_URI is set,
// otherwise an in-memory store with the same functions, so the demo never dies on stage.
import { randomUUID } from "node:crypto";
import type { Business, Campaign, CampaignBrief, Collaboration, CollaborationView, CollabStatus, Creator } from "@/lib/types";
import { BUSINESSES, SEED_CREATORS } from "@/mocks/data";
import { canMove } from "@/lib/status";
import { getDb, hasMongo } from "./mongo";

/** Demo-only scheduled reply from a seed creator (so Jordan/Alex answer during the demo). */
interface SimReply { at: number; action: "accept" | "counter"; fee?: number; note?: string }
type StoredCollab = Collaboration & { sim?: SimReply };
interface Token { creatorId: string; accessToken: string; igUserId: string; expiresAt?: string; updatedAt: string }

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const notFound = (what: string) => new HttpError(404, `${what} not found`);
const now = () => new Date().toISOString();
export const newId = () => randomUUID().replace(/-/g, "").slice(0, 12);
const clean = <T,>(d: T | null): T | null => { if (!d) return d; const { _id, sim, ...rest } = d as T & { _id?: unknown; sim?: unknown }; void _id; void sim; return rest as T; };

/* ---------------- in-memory backend ---------------- */
interface Mem { creators: Creator[]; businesses: Business[]; campaigns: Campaign[]; collabs: StoredCollab[]; tokens: Token[] }
const g = globalThis as unknown as { __mem?: Mem };
const mem = (): Mem => (g.__mem ??= { creators: structuredClone(SEED_CREATORS), businesses: structuredClone(BUSINESSES), campaigns: [], collabs: [], tokens: [] });

/* ---------------- collections ---------------- */
async function col<T extends object>(name: string) { return (await getDb()).collection<T>(name); }

export const backend = () => (hasMongo() ? "atlas" : "memory");

/* ---------------- creators ---------------- */
export async function getCreators(): Promise<Creator[]> {
  if (!hasMongo()) return mem().creators;
  return (await col<Creator>("creators")).find({}, { projection: { _id: 0 } }).toArray();
}

/** Atlas narrows candidates before scoring (spec 7.4): anyone sharing a topic, area or audience with the brief. */
export async function prefilterCreators(brief: CampaignBrief): Promise<Creator[]> {
  const match = (c: Creator) => c.niches.some(n => brief.niches.includes(n)) || c.serviceAreas.includes(brief.location) || c.audienceTags.some(a => brief.audienceTags.includes(a));
  if (!hasMongo()) return mem().creators.filter(match);
  return (await col<Creator>("creators")).find({
    $or: [
      { niches: { $in: brief.niches } },
      { serviceAreas: { $in: [brief.location] } },
      { audienceTags: { $in: brief.audienceTags } }
    ]
  }, { projection: { _id: 0 } }).toArray();
}

export async function getCreator(id: string): Promise<Creator> {
  const c = hasMongo() ? clean(await (await col<Creator>("creators")).findOne({ id })) : mem().creators.find(x => x.id === id) ?? null;
  if (!c) throw notFound("Creator");
  return c;
}

export async function findCreatorByHandle(handle: string): Promise<Creator | null> {
  if (!hasMongo()) return mem().creators.find(x => x.handle.toLowerCase() === handle.toLowerCase()) ?? null;
  return clean(await (await col<Creator>("creators")).findOne({ handle: new RegExp(`^${handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }));
}

export async function upsertCreator(c: Creator): Promise<Creator> {
  if (!hasMongo()) { const m = mem(); const i = m.creators.findIndex(x => x.id === c.id); if (i >= 0) m.creators[i] = c; else m.creators.push(c); return c; }
  await (await col<Creator>("creators")).replaceOne({ id: c.id }, c, { upsert: true });
  return c;
}

const CREATOR_EDITABLE: (keyof Creator)[] = ["rate", "rateType", "niches", "contentStyles", "audienceTags", "bio", "available", "hood", "serviceAreas", "topicCounts"];
export async function updateCreator(id: string, patch: Partial<Creator>): Promise<Creator> {
  const safe = Object.fromEntries(Object.entries(patch).filter(([k]) => CREATOR_EDITABLE.includes(k as keyof Creator))) as Partial<Creator>;
  if (safe.rate !== undefined && !(Number(safe.rate) > 0)) throw new HttpError(400, "Rate must be above $0");
  if (!hasMongo()) { const c = mem().creators.find(x => x.id === id); if (!c) throw notFound("Creator"); Object.assign(c, safe); return c; }
  const r = await (await col<Creator>("creators")).findOneAndUpdate({ id }, { $set: safe }, { returnDocument: "after", projection: { _id: 0 } });
  if (!r) throw notFound("Creator");
  return r;
}

/* ---------------- businesses ---------------- */
export async function getBusinesses(): Promise<Business[]> {
  if (!hasMongo()) return mem().businesses;
  return (await col<Business>("businesses")).find({}, { projection: { _id: 0 } }).toArray();
}
export async function getBusiness(id: string): Promise<Business> {
  const b = hasMongo() ? clean(await (await col<Business>("businesses")).findOne({ id })) : mem().businesses.find(x => x.id === id) ?? null;
  if (!b) throw notFound("Business");
  return b;
}

/* ---------------- campaigns ---------------- */
export async function insertCampaign(input: { businessId: string; prompt: string; brief: CampaignBrief; briefSource: Campaign["briefSource"] }): Promise<Campaign> {
  await getBusiness(input.businessId);
  const c: Campaign = { id: newId(), ...input, status: "matched", createdAt: now() };
  if (!hasMongo()) { mem().campaigns.unshift(c); return c; }
  await (await col<Campaign>("campaigns")).insertOne({ ...c });
  return c;
}
export async function getCampaign(id: string): Promise<Campaign> {
  const c = hasMongo() ? clean(await (await col<Campaign>("campaigns")).findOne({ id })) : mem().campaigns.find(x => x.id === id) ?? null;
  if (!c) throw notFound("Campaign");
  return c;
}
export async function listCampaigns(businessId: string): Promise<Campaign[]> {
  if (!hasMongo()) return mem().campaigns.filter(c => c.businessId === businessId);
  return (await col<Campaign>("campaigns")).find({ businessId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
}
export async function updateCampaignBrief(id: string, patch: Partial<CampaignBrief>): Promise<Campaign> {
  const c = await getCampaign(id);
  const brief = { ...c.brief, ...patch };
  if (!(brief.budget > 0)) throw new HttpError(400, "Budget must be above $0");
  if (!hasMongo()) { Object.assign(c, { brief }); return c; }
  await (await col<Campaign>("campaigns")).updateOne({ id }, { $set: { brief } });
  return { ...c, brief };
}
async function setCampaignStatus(id: string, status: Campaign["status"]) {
  if (!hasMongo()) { const c = mem().campaigns.find(x => x.id === id); if (c) c.status = status; return; }
  await (await col<Campaign>("campaigns")).updateOne({ id }, { $set: { status } });
}

/* ---------------- collaborations ---------------- */
export async function insertCollaborations(campaignId: string, rows: { creatorId: string; proposal: string; offeredFee: number; matchScore: number }[], simulate: boolean): Promise<Collaboration[]> {
  const camp = await getCampaign(campaignId);
  const t = now();
  const made: StoredCollab[] = [];
  for (const [i, r] of rows.entries()) {
    const creator = await getCreator(r.creatorId);
    const c: StoredCollab = {
      id: newId(), campaignId, businessId: camp.businessId, creatorId: r.creatorId, status: "invited", proposal: r.proposal,
      compensation: r.offeredFee, offeredFee: r.offeredFee, inviteToken: newId(), matchScore: r.matchScore,
      createdAt: t, updatedAt: t, history: [{ status: "invited", at: t }]
    };
    // Demo: seed creators other than Maya (whom we accept live) answer on their own; Alex asks for $10 more.
    if (simulate && creator.dataSource !== "business" && creator.id !== "maya" && SEED_CREATORS.some(s => s.id === creator.id)) {
      c.sim = creator.id === "alex"
        ? { at: Date.now() + 4000 + i * 3500, action: "counter", fee: r.offeredFee + 10, note: "I'd add a carousel post" }
        : { at: Date.now() + 4000 + i * 3500, action: "accept" };
    }
    made.push(c);
  }
  if (!hasMongo()) mem().collabs.push(...made);
  else await (await col<StoredCollab>("collaborations")).insertMany(made.map(m => ({ ...m })));
  await setCampaignStatus(campaignId, "active");
  return made.map(m => clean(m)!);
}

/** Apply simulated replies whose time has come (demo only). */
async function applySims() {
  const t = Date.now();
  if (!hasMongo()) {
    for (const c of mem().collabs) if (c.sim && c.sim.at <= t) { const s = c.sim; delete c.sim; if (c.status === "invited") applyStatus(c, s); }
    return;
  }
  const coll = await col<StoredCollab>("collaborations");
  const due = await coll.find({ "sim.at": { $lte: t }, status: "invited" }).toArray();
  for (const d of due) {
    const s = d.sim!;
    const status: CollabStatus = s.action === "accept" ? "accepted" : "countered";
    const at = now();
    await coll.updateOne({ id: d.id, status: "invited" }, {
      $set: { status, updatedAt: at, simulated: true, ...(s.action === "counter" ? { counterFee: s.fee, counterNote: s.note } : {}) },
      $unset: { sim: "" }, $push: { history: { status, at } }
    });
  }
}
function applyStatus(c: Collaboration, s: SimReply) {
  const status: CollabStatus = s.action === "accept" ? "accepted" : "countered";
  c.status = status; c.updatedAt = now(); c.history.push({ status, at: c.updatedAt }); c.simulated = true;
  if (s.action === "counter") { c.counterFee = s.fee; c.counterNote = s.note; }
}

async function toViews(list: Collaboration[]): Promise<CollaborationView[]> {
  const out: CollaborationView[] = [];
  const cache = new Map<string, unknown>();
  const once = async <T,>(key: string, f: () => Promise<T>) => (cache.has(key) ? (cache.get(key) as T) : (cache.set(key, await f()), cache.get(key) as T));
  for (const c of list) {
    const [campaign, business, creator] = await Promise.all([
      once(`c:${c.campaignId}`, () => getCampaign(c.campaignId)),
      once(`b:${c.businessId}`, () => getBusiness(c.businessId)),
      once(`r:${c.creatorId}`, () => getCreator(c.creatorId))
    ]);
    out.push({ ...c, campaign, business, creator });
  }
  return out;
}

export async function listCollaborations(q: { creatorId?: string; campaignId?: string }): Promise<CollaborationView[]> {
  await applySims();
  const filter: Record<string, string> = {};
  if (q.creatorId) filter.creatorId = q.creatorId;
  if (q.campaignId) filter.campaignId = q.campaignId;
  if (!filter.creatorId && !filter.campaignId) throw new HttpError(400, "Pass creatorId or campaignId");
  const list = hasMongo()
    ? (await (await col<StoredCollab>("collaborations")).find(filter, { projection: { _id: 0, sim: 0 } }).sort({ createdAt: 1 }).toArray())
    : mem().collabs.filter(c => (!q.creatorId || c.creatorId === q.creatorId) && (!q.campaignId || c.campaignId === q.campaignId)).map(c => clean(c)!);
  return toViews(list);
}

export async function getCollaboration(id: string): Promise<Collaboration> {
  const c = hasMongo() ? clean(await (await col<StoredCollab>("collaborations")).findOne({ id })) : clean(mem().collabs.find(x => x.id === id) ?? null);
  if (!c) throw notFound("Invitation");
  return c;
}

export async function getInviteView(token: string): Promise<CollaborationView> {
  await applySims();
  const c = hasMongo() ? clean(await (await col<StoredCollab>("collaborations")).findOne({ inviteToken: token })) : clean(mem().collabs.find(x => x.inviteToken === token) ?? null);
  if (!c) throw new HttpError(404, "This invite link isn't valid anymore");
  return (await toViews([c]))[0];
}

/** One write per status change: status, counter fields and a history entry (spec 11.1). */
export async function setCollaborationStatus(id: string, to: CollabStatus, extra: { counterFee?: number; counterNote?: string } = {}): Promise<Collaboration> {
  const c = await getCollaboration(id);
  if (!canMove(c.status, to)) throw new HttpError(400, `Can't go from ${c.status} to ${to}`);
  if (to === "countered" && !(Number(extra.counterFee) > 0)) throw new HttpError(400, "A new fee above $0 is required");
  const at = now();
  const set: Partial<Collaboration> = { status: to, updatedAt: at };
  const unset: Record<string, ""> = {};
  if (to === "countered") { set.counterFee = Number(extra.counterFee); set.counterNote = extra.counterNote?.slice(0, 280) ?? ""; }
  if (c.status === "countered" && to === "accepted" && c.counterFee) { set.offeredFee = c.counterFee; set.compensation = c.counterFee; }
  if (c.status === "countered" && to === "invited") { unset.counterFee = ""; unset.counterNote = ""; }
  if (!hasMongo()) {
    const m = mem().collabs.find(x => x.id === id)!;
    Object.assign(m, set); for (const k of Object.keys(unset)) delete (m as unknown as Record<string, unknown>)[k];
    m.history.push({ status: to, at }); delete m.sim;
    return clean(m)!;
  }
  const coll = await col<StoredCollab>("collaborations");
  const r = await coll.findOneAndUpdate(
    { id, status: c.status }, // guard against a concurrent change
    { $set: set, ...(Object.keys(unset).length ? { $unset: { ...unset, sim: "" } } : { $unset: { sim: "" } }), $push: { history: { status: to, at } } },
    { returnDocument: "after", projection: { _id: 0, sim: 0 } }
  );
  if (!r) throw new HttpError(409, "This invitation changed meanwhile. Refresh and try again.");
  return r;
}

/* ---------------- Instagram tokens (server only, never returned to the browser) ---------------- */
export async function saveToken(t: Omit<Token, "updatedAt">) {
  const doc = { ...t, updatedAt: now() };
  if (!hasMongo()) { const m = mem(); m.tokens = m.tokens.filter(x => x.creatorId !== t.creatorId).concat(doc); return; }
  await (await col<Token>("oauthTokens")).replaceOne({ creatorId: t.creatorId }, doc, { upsert: true });
}

/* ---------------- seed / reset ---------------- */
export async function resetAll() {
  if (!hasMongo()) { g.__mem = undefined; mem(); return { backend: "memory" as const, creators: SEED_CREATORS.length }; }
  const db = await getDb();
  await Promise.all(["creators", "businesses", "campaigns", "collaborations"].map(n => db.collection(n).deleteMany({})));
  await db.collection("creators").insertMany(structuredClone(SEED_CREATORS));
  await db.collection("businesses").insertMany(structuredClone(BUSINESSES));
  return { backend: "atlas" as const, creators: SEED_CREATORS.length };
}

/** First request against an empty Atlas database seeds it automatically. */
const seeded = globalThis as unknown as { __seeded?: boolean };
export async function ensureSeeded() {
  if (!hasMongo() || seeded.__seeded) return;
  const db = await getDb();
  if ((await db.collection("creators").estimatedDocumentCount()) === 0) await resetAll();
  seeded.__seeded = true;
}
