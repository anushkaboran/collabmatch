// The only way the UI talks to data. Mirrors the API contract (spec section 12).
// By default the UI calls the real API routes in src/app/api (which fall back to an in-memory store without MONGODB_URI).
// Set NEXT_PUBLIC_USE_MOCKS=true to run entirely in the browser via src/mocks/store.ts (no server needed).
import type { Campaign, CampaignBrief, Collaboration, CollaborationView, CollabStatus, Creator, MatchesResult, ParseResult, Platform } from "./types";
import { mock } from "@/mocks/store";

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

async function http<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  parseCampaign: (prompt: string): Promise<ParseResult> =>
    USE_MOCKS ? mock.parseCampaign(prompt) : http("/api/campaigns/parse", { method: "POST", json: { prompt } }),

  createCampaign: (input: { businessId: string; prompt: string; brief: CampaignBrief; briefSource?: "gemini" | "heuristic" }): Promise<Campaign> =>
    USE_MOCKS ? mock.createCampaign(input) : http("/api/campaigns", { method: "POST", json: input }),

  listCampaigns: (businessId: string): Promise<Campaign[]> =>
    USE_MOCKS ? mock.listCampaigns(businessId) : http(`/api/campaigns?businessId=${encodeURIComponent(businessId)}`),

  getCampaign: (id: string): Promise<{ campaign: Campaign; collaborations: CollaborationView[] }> =>
    USE_MOCKS ? mock.getCampaign(id) : http(`/api/campaigns/${id}`),

  updateCampaign: (id: string, brief: Partial<CampaignBrief>): Promise<Campaign> =>
    USE_MOCKS ? mock.updateCampaign(id, brief) : http(`/api/campaigns/${id}`, { method: "PATCH", json: brief }),

  getMatches: (id: string): Promise<MatchesResult> =>
    USE_MOCKS ? mock.getMatches(id) : http(`/api/campaigns/${id}/matches`),

  draftProposal: (campaignId: string, creatorId: string): Promise<{ proposal: string }> =>
    USE_MOCKS ? mock.draftProposal(campaignId, creatorId) : http("/api/proposals", { method: "POST", json: { campaignId, creatorId } }),

  sendInvites: (campaignId: string, invites: { creatorId: string; proposal: string; offeredFee: number }[]): Promise<Collaboration[]> =>
    USE_MOCKS ? mock.sendInvites(campaignId, invites) : http("/api/collaborations", { method: "POST", json: { campaignId, invites } }),

  listCollaborations: (q: { creatorId?: string; campaignId?: string }): Promise<CollaborationView[]> =>
    USE_MOCKS ? mock.listCollaborations(q) : http(`/api/collaborations?${new URLSearchParams(q as Record<string, string>)}`),

  updateCollaboration: (id: string, patch: { status: CollabStatus; counterFee?: number; counterNote?: string }): Promise<Collaboration> =>
    USE_MOCKS ? mock.updateCollaboration(id, patch) : http(`/api/collaborations/${id}`, { method: "PATCH", json: patch }),

  getCreator: (id: string): Promise<Creator> =>
    USE_MOCKS ? mock.getCreator(id) : http(`/api/creators/${id}`),

  updateCreator: (id: string, patch: Partial<Creator>): Promise<Creator> =>
    USE_MOCKS ? mock.updateCreator(id, patch) : http(`/api/creators/${id}`, { method: "PATCH", json: patch }),

  importCreator: (input: { handle: string; platform: Platform; followers: number; notes: string }): Promise<Creator> =>
    USE_MOCKS ? mock.importCreator(input) : http("/api/creators/import", { method: "POST", json: input }),

  getInvite: (token: string): Promise<CollaborationView> =>
    USE_MOCKS ? mock.getInvite(token) : http(`/api/invite/${token}`),

  respondInvite: (token: string, action: "accept" | "decline" | "counter", fee?: number, note?: string): Promise<Collaboration> =>
    USE_MOCKS ? mock.respondInvite(token, action, fee, note) : http(`/api/invite/${token}/respond`, { method: "POST", json: { action, fee, note } }),

  /** Mock / fallback connect. In real mode the UI redirects to /api/auth/instagram instead (see instagramLoginUrl). */
  demoConnect: (handle?: string): Promise<Creator> =>
    USE_MOCKS ? mock.demoConnect(handle) : http("/api/demo/connect", { method: "POST", json: { handle } }),

  reset: (): Promise<unknown> => (USE_MOCKS ? mock.reset() : http("/api/seed", { method: "POST" })),

  /** Call fn when data changes elsewhere (another tab in mock mode). Polling covers the rest. */
  subscribe: (fn: () => void): (() => void) => (USE_MOCKS && typeof window !== "undefined" ? mock.subscribe(fn) : () => {})
};

export const instagramLoginUrl = (inviteToken?: string) => `/api/auth/instagram${inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : ""}`;

/** The signed-in business/creator persona (no auth for the hackathon). */
export const session = {
  businessId: () => "kettle",
  getCreatorId: (): string | null => { try { return localStorage.getItem("collabmatch-creator"); } catch { return null; } },
  setCreatorId: (v: string | null) => { try { if (v) localStorage.setItem("collabmatch-creator", v); else localStorage.removeItem("collabmatch-creator"); } catch { /* ignore */ } }
};
