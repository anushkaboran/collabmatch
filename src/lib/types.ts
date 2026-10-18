// Shared contract between frontend (Person B) and backend (Person A).
// Matches section 11 of the CollabMatch specification. Announce any change to your teammate.

export type Platform = "instagram" | "tiktok" | "youtube";
export type DataSource = "instagram" | "tiktok" | "self" | "business";

export interface TopPost {
  caption: string;
  permalink: string;
  thumbnailUrl: string;
}

export interface Creator {
  id: string;
  name: string;
  handle: string;
  bio: string;
  niches: string[]; // vocabulary: NICHES
  audienceTags: string[]; // vocabulary: AUDIENCES
  audienceAgeRange: [number, number];
  location: string; // city, e.g. "Seattle"
  hood: string; // neighborhood, e.g. "Capitol Hill"
  serviceAreas: string[];
  platforms: Platform[];
  followers: number;
  engagementRate?: number; // 0–1, only when supplied/verified
  contentStyles: string[]; // vocabulary: CONTENT_TYPES
  rate: number; // USD per package (1 short video + 2 stories)
  available: boolean;
  avatarColor: string;
  // social login additions
  dataSource: DataSource;
  verified: boolean;
  connectedPlatforms: Platform[];
  socialUrl?: string;
  topPosts: TopPost[];
  rateType: "quoted" | "estimated";
  suggestedRateRange?: [number, number];
  claimed: boolean;
  lastSyncedAt?: string;
  // optional insight summaries shown on the creator profile (Instagram, 100+ followers)
  audienceCities?: { label: string; pct: number }[];
  audienceAges?: { label: string; pct: number }[];
  topicCounts?: { label: string; count: number }[];
  postsPerWeek?: number;
}

export interface Business {
  id: string;
  name: string;
  category: string;
  location: string;
  hood: string;
  description: string;
  photo: string;
}

export interface CampaignBrief {
  title: string;
  objective: string;
  productOrService: string;
  targetAudience: string;
  audienceTags: string[];
  niches: string[];
  location: string;
  platforms: Platform[];
  contentTypes: string[];
  budget: number;
  timeline: string;
  deliverables: string[];
}

export type CampaignStatus = "draft" | "matched" | "active";

export interface Campaign {
  id: string;
  businessId: string;
  prompt: string;
  brief: CampaignBrief;
  status: CampaignStatus;
  briefSource: "gemini" | "heuristic";
  createdAt: string;
}

export interface FactorScore {
  key: "audience" | "niche" | "location" | "budget" | "style" | "engagement" | "platform";
  label: string;
  weight: number;
  score: number; // 0–1
  evidence: string;
}

export interface CreatorMatch {
  creator: Creator;
  score: number; // 0–100
  factors: FactorScore[];
  summary: string;
  eligible: boolean;
  ineligibleReason?: string;
  confidence?: "high" | "medium" | "low";
}

export interface TeamPlan {
  id: "best" | "one" | "reach";
  label: string;
  description: string;
  creatorIds: string[];
  totalCost: number;
  teamScore: number;
  estimatedUniqueReach: number;
  tradeoffs: string;
  hasEstimatedRates?: boolean;
}

export type CollabStatus = "invited" | "countered" | "accepted" | "declined" | "in_progress" | "submitted" | "completed";

export interface Collaboration {
  id: string;
  campaignId: string;
  businessId: string;
  creatorId: string;
  status: CollabStatus;
  proposal: string;
  compensation: number;
  offeredFee: number;
  counterFee?: number;
  counterNote?: string;
  inviteToken: string;
  matchScore: number;
  createdAt: string;
  updatedAt: string;
  history: { status: CollabStatus; at: string }[];
  simulated?: boolean; // mock mode only: reply was simulated
}

/** Collaboration with joined records, as returned by GET /api/collaborations and GET /api/invite/[token]. */
export interface CollaborationView extends Collaboration {
  campaign: Campaign;
  business: Business;
  creator: Creator;
}

export interface ParseResult {
  brief: CampaignBrief;
  source: "gemini" | "heuristic";
}

export interface MatchesResult {
  matches: CreatorMatch[];
  teams: TeamPlan[];
}
