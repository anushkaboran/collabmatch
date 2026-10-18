// Instagram API with Instagram Login (Business Login for Instagram).
// Creators must have a business or creator account; before Meta app review only accounts added as testers can log in.
// Follower count and demographics are not returned under 100 followers, so Gemini post analysis carries small creators.
import type { Creator } from "@/lib/types";
import { estimateRate } from "@/lib/engine";
import { photoPost } from "@/mocks/data";
import { analyzeCreator } from "./gemini";
import { findCreatorByHandle, getCreator, saveToken, upsertCreator } from "./db";
import { scrub } from "./safety";

export const SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"];
export const hasInstagram = () => !!(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET && process.env.INSTAGRAM_REDIRECT_URI);

export function authorizeUrl(state: string) {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.searchParams.set("client_id", process.env.INSTAGRAM_APP_ID!);
  u.searchParams.set("redirect_uri", process.env.INSTAGRAM_REDIRECT_URI!);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPES.join(","));
  u.searchParams.set("state", state);
  return u.toString();
}

async function igJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Instagram ${res.status}: ${scrub(JSON.stringify((data as { error?: unknown }).error ?? data))}`);
  return data as T;
}

/** code → long-lived token (60 days) */
export async function exchangeCode(code: string): Promise<{ accessToken: string; igUserId: string; expiresAt?: string }> {
  const form = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!, client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code", redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!, code
  });
  const short = await igJson<{ access_token: string; user_id: number | string }>("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
  try {
    const long = await igJson<{ access_token: string; expires_in: number }>(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(process.env.INSTAGRAM_APP_SECRET!)}&access_token=${encodeURIComponent(short.access_token)}`
    );
    return { accessToken: long.access_token, igUserId: String(short.user_id), expiresAt: new Date(Date.now() + long.expires_in * 1000).toISOString() };
  } catch {
    return { accessToken: short.access_token, igUserId: String(short.user_id) };
  }
}

interface IgProfile { user_id?: string; id?: string; username: string; name?: string; followers_count?: number; media_count?: number; biography?: string }
interface IgMedia { id: string; caption?: string; media_type?: string; media_url?: string; thumbnail_url?: string; permalink?: string; like_count?: number; comments_count?: number }
type Breakdown = { data?: { total_value?: { breakdowns?: { results?: { dimension_values: string[]; value: number }[] }[] } }[] };

async function demographics(igUserId: string, token: string, breakdown: "city" | "age") {
  try {
    const r = await igJson<Breakdown>(`https://graph.instagram.com/${igUserId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=${breakdown}&access_token=${encodeURIComponent(token)}`);
    const rows = r.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
    const total = rows.reduce((t, x) => t + x.value, 0) || 1;
    return rows.sort((a, b) => b.value - a.value).slice(0, 4).map(x => ({ label: x.dimension_values[0].split(",")[0], pct: Math.round((x.value / total) * 100) }));
  } catch {
    return undefined; // under 100 followers, or permission not granted: fine, posts still drive matching
  }
}

/** Pull profile, posts and audience; let Gemini read the posts; save a verified creator. */
export async function syncCreator(token: { accessToken: string; igUserId: string; expiresAt?: string }, claimCreatorId?: string): Promise<Creator> {
  const t = encodeURIComponent(token.accessToken);
  const me = await igJson<IgProfile>(`https://graph.instagram.com/me?fields=user_id,username,name,followers_count,media_count&access_token=${t}`);
  const media = await igJson<{ data: IgMedia[] }>(`https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,like_count,comments_count&limit=25&access_token=${t}`).catch(() => ({ data: [] as IgMedia[] }));
  const [cities, ages] = await Promise.all([demographics(token.igUserId, token.accessToken, "city"), demographics(token.igUserId, token.accessToken, "age")]);

  const posts = media.data ?? [];
  const analysis = await analyzeCreator({
    captions: posts.map(p => p.caption ?? "").filter(Boolean),
    bio: me.biography ?? "",
    mediaTypes: posts.map(p => p.media_type ?? ""),
    demographicsCities: cities?.map(c => c.label)
  });

  const followers = me.followers_count ?? 0;
  const engagement = followers > 0 && posts.length
    ? posts.reduce((s, p) => s + (p.like_count ?? 0) + (p.comments_count ?? 0), 0) / posts.length / followers
    : undefined;
  const handle = `@${me.username}`;
  const existing = claimCreatorId ? await getCreator(claimCreatorId).catch(() => null) : await findCreatorByHandle(handle);
  const city = cities?.[0]?.label ?? analysis.city ?? existing?.location ?? "Seattle";
  const suggested = estimateRate(followers || 1000, engagement);
  const topPosts = posts.filter(p => p.media_url || p.thumbnail_url).slice(0, 6).map(p => ({
    caption: (p.caption ?? "").slice(0, 120), permalink: p.permalink ?? "#", thumbnailUrl: (p.media_type === "VIDEO" ? p.thumbnail_url : p.media_url) ?? p.thumbnail_url ?? ""
  }));

  const creator: Creator = {
    id: existing?.id ?? `ig${token.igUserId}`,
    name: me.name || existing?.name || me.username,
    handle, bio: me.biography ?? existing?.bio ?? "",
    niches: analysis.niches, audienceTags: analysis.audienceTags, contentStyles: analysis.contentStyles, topicCounts: analysis.topicCounts,
    audienceAgeRange: [18, 34],
    location: city, hood: existing?.hood ?? city, serviceAreas: [...new Set([existing?.hood, city].filter(Boolean) as string[])],
    platforms: ["instagram"], followers, engagementRate: engagement,
    rate: existing?.rateType === "quoted" ? existing.rate : suggested,
    rateType: existing?.rateType === "quoted" ? "quoted" : "estimated",
    suggestedRateRange: [Math.max(40, Math.round((suggested * 0.85) / 5) * 5), Math.round((suggested * 1.15) / 5) * 5],
    available: existing?.available ?? true,
    avatarColor: existing?.avatarColor ?? "pink",
    dataSource: "instagram", verified: true, connectedPlatforms: ["instagram"], claimed: true,
    socialUrl: `https://instagram.com/${me.username}`,
    topPosts: topPosts.length ? topPosts : [photoPost("cafe3"), photoPost("food2")],
    audienceCities: cities, audienceAges: ages,
    postsPerWeek: undefined,
    lastSyncedAt: new Date().toISOString()
  };
  await upsertCreator(creator);
  await saveToken({ creatorId: creator.id, accessToken: token.accessToken, igUserId: token.igUserId, expiresAt: token.expiresAt });
  return creator;
}
