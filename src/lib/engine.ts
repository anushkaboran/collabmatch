// Mock-mode engine: TypeScript port of the prototype logic (spec sections 7–9).
// Person A: lift parseCampaign → src/lib/gemini.ts fallback, scoreCreator → src/lib/matching.ts,
// optimize → src/lib/optimizer.ts. The frontend only ever calls src/lib/api.ts.
import type { CampaignBrief, Creator, CreatorMatch, FactorScore, Platform, TeamPlan } from "@/lib/types";
import { METRO } from "@/mocks/data";

const KEYWORDS: [RegExp, { niches?: string[]; audience?: string[] }][] = [
  [/coffee|caf[eé]|matcha|latte|espresso|tea|drink|bakery/i, { niches: ["cafés & coffee", "food"] }],
  [/restaurant|food|menu|dish|brunch|eat/i, { niches: ["food"] }],
  [/student|college|campus|uw\b|university/i, { audience: ["college students"], niches: ["student life"] }],
  [/professional|office|commuter|young adult/i, { audience: ["young professionals"] }],
  [/foodie/i, { audience: ["foodies"] }],
  [/gym|fitness|yoga|workout|studio/i, { niches: ["fitness"], audience: ["fitness fans"] }],
  [/boutique|clothing|fashion|apparel/i, { niches: ["fashion"], audience: ["fashion shoppers"] }],
  [/famil|kids|parent/i, { audience: ["parents"], niches: ["family"] }],
  [/local|neighbou?rhood|visit|foot traffic|launch/i, { niches: ["local discovery"] }]
];
const CITIES = ["Seattle", "Portland", "Bellevue", "Tacoma", "Los Angeles"];
const uniq = <T,>(a: T[]) => [...new Set(a)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function parseCampaign(prompt: string): CampaignBrief {
  const niches: string[] = [], audience: string[] = [], platforms: Platform[] = [];
  for (const [re, add] of KEYWORDS) if (re.test(prompt)) { niches.push(...(add.niches ?? [])); audience.push(...(add.audience ?? [])); }
  if (/instagram|insta|\big\b|reels?/i.test(prompt)) platforms.push("instagram");
  if (/tiktok/i.test(prompt)) platforms.push("tiktok");
  const money = prompt.match(/\$\s?(\d[\d,]*)/);
  const city = CITIES.find(c => new RegExp(c, "i").test(prompt)) ?? "Seattle";
  const product = (prompt.match(/(?:new|seasonal|launching (?:a|our)?)\s+([a-z\s]+?)(?:\s(?:drink|menu|line|launch)|[.,]| next| this| to\b)/i) ?? [])[1]?.trim();
  const isLaunch = /launch|new|seasonal/i.test(prompt);
  const aud = uniq(audience.length ? audience : ["young professionals"]);
  return {
    title: product ? (isLaunch ? `${cap(product)} launch` : cap(product)) : "Local awareness campaign",
    objective: isLaunch ? `Get local people to try the ${product ?? "new product"} in its first weeks and visit in person.` : "Grow local awareness and bring new customers in the door.",
    productOrService: product ?? "",
    targetAudience: aud.join(" and "),
    audienceTags: aud,
    niches: uniq(niches.length ? niches : ["local discovery"]),
    location: city,
    platforms: platforms.length ? uniq(platforms) : ["instagram", "tiktok"],
    contentTypes: ["short-form video", "reviews"],
    budget: money ? Number(money[1].replace(/,/g, "")) : 300,
    timeline: /next month/i.test(prompt) ? "Next month, 2–3 weeks" : "Within 3 weeks",
    deliverables: ["1 short video", "2 stories"]
  };
}

const share = (have: string[], want: string[]) => (want.length ? have.filter(x => want.includes(x)).length / want.length : 0);
const list = (a: string[]) => (a.length ? a.join(", ") : "none");
const platformName = (p: string) => (p === "tiktok" ? "TikTok" : p === "instagram" ? "Instagram" : cap(p));
const WEIGHTS: [FactorScore["key"], string, number][] = [
  ["audience", "Audience", 0.25], ["niche", "Content niche", 0.2], ["location", "Location", 0.15],
  ["budget", "Budget fit", 0.15], ["style", "Content style", 0.1], ["engagement", "Engagement", 0.1], ["platform", "Platform", 0.05]
];

export function scoreCreator(c: Creator, b: CampaignBrief): CreatorMatch {
  const audHit = c.audienceTags.filter(x => b.audienceTags.includes(x));
  const nicheHit = c.niches.filter(x => b.niches.includes(x));
  const styleHit = c.contentStyles.filter(x => b.contentTypes.includes(x));
  const platHit = c.platforms.filter(x => b.platforms.includes(x));
  const sameCity = c.location === b.location, metro = (METRO[b.location] ?? []).includes(c.location);
  const r = c.rate / b.budget;
  const eng = c.engagementRate;
  const s: Record<FactorScore["key"], [number, string]> = {
    audience: [share(c.audienceTags, b.audienceTags), audHit.length ? `Reaches ${list(audHit)}` : `Audience is ${list(c.audienceTags)}`],
    niche: [Math.min(1, share(c.niches, b.niches) * 1.5), `Posts about ${list(nicheHit.length ? nicheHit : c.niches)}`],
    location: [sameCity ? 1 : metro ? 0.6 : 0, sameCity ? `Based in ${c.hood}, ${c.location}` : metro ? `Nearby: ${c.location}` : `Based in ${c.location}, outside ${b.location}`],
    budget: [r <= 0.4 ? 1 : r >= 1 ? 0 : 1 - (r - 0.4) / 0.6, `$${c.rate} is ${Math.round(r * 100)}% of the $${b.budget} budget`],
    style: [share(c.contentStyles, b.contentTypes), `Makes ${list(styleHit.length ? styleHit : c.contentStyles)}`],
    engagement: [eng == null ? 0.5 : Math.min(1, eng / 0.08), eng == null ? "Engagement not shared yet" : `${(eng * 100).toFixed(1)}% engagement${c.verified ? " (from Instagram)" : ""}`],
    platform: [share(c.platforms, b.platforms), platHit.length ? `On ${list(platHit.map(platformName))}` : `Only on ${list(c.platforms.map(platformName))}`]
  };
  const factors: FactorScore[] = WEIGHTS.map(([key, label, weight]) => ({ key, label, weight, score: s[key][0], evidence: s[key][1] }));
  const score = Math.round(100 * factors.reduce((t, f) => t + f.weight * f.score, 0));
  let reason: string | undefined;
  if (!c.available) reason = "Fully booked during your campaign dates";
  else if (c.rate > b.budget) reason = `Rate $${c.rate} is over your $${b.budget} budget`;
  else if (s.location[0] === 0) reason = `Outside ${b.location}`;
  const top = [...factors].sort((a, z) => z.weight * z.score - a.weight * a.score).slice(0, 2);
  return {
    creator: c, score, factors, eligible: !reason, ineligibleReason: reason,
    summary: `${top[0].evidence}. ${top[1].evidence}.`,
    confidence: c.verified ? "high" : c.dataSource === "self" ? "medium" : "low"
  };
}

export function overlap(a: Creator, b: Creator) {
  const A = new Set([...a.audienceTags, a.hood]), B = new Set([...b.audienceTags, b.hood]);
  const inter = [...A].filter(x => B.has(x)).length;
  return inter / new Set([...A, ...B]).size;
}

interface Team { members: CreatorMatch[]; cost: number; value: number; reach: number; avgOv: number; avgScore: number }

export function optimize(matches: CreatorMatch[], budget: number, lambda = 20, floor = 55): TeamPlan[] {
  const pool = matches.filter(m => m.eligible && m.score >= 45).slice(0, 12);
  const teams: Team[] = [];
  const walk = (start: number, team: CreatorMatch[], cost: number) => {
    if (team.length) {
      let ov = 0, pairs = 0;
      for (let i = 0; i < team.length; i++) for (let j = i + 1; j < team.length; j++) { ov += overlap(team[i].creator, team[j].creator); pairs++; }
      const gain = team.reduce((t, m) => t + Math.max(0, m.score - floor), 0);
      const followers = team.reduce((t, m) => t + m.creator.followers, 0);
      const avgOv = pairs ? ov / pairs : 0;
      teams.push({ members: [...team], cost, value: gain - lambda * ov, reach: Math.round(followers * (1 - avgOv * 0.6)), avgOv, avgScore: Math.round(team.reduce((t, m) => t + m.score, 0) / team.length) });
    }
    if (team.length === 4) return;
    for (let i = start; i < pool.length; i++) {
      if (cost + pool[i].creator.rate > budget) continue;
      team.push(pool[i]); walk(i + 1, team, cost + pool[i].creator.rate); team.pop();
    }
  };
  walk(0, [], 0);
  if (!teams.length) return [];
  const best = [...teams].sort((a, b) => b.value - a.value)[0];
  const single = teams.filter(t => t.members.length === 1).sort((a, b) => b.value - a.value)[0];
  const reach = teams.filter(t => t.avgScore >= 65).sort((a, b) => b.reach - a.reach || b.value - a.value)[0];
  const out: [TeamPlan["id"], string, Team][] = [["best", "Recommended team", best]];
  if (single && single !== best) out.push(["one", "One standout creator", single]);
  if (reach && reach !== best && reach !== single) out.push(["reach", "Widest reach", reach]);
  return out.map(([id, label, t]) => ({
    id, label, description: label, creatorIds: t.members.map(m => m.creator.id), totalCost: t.cost,
    teamScore: Math.round(t.value * 10) / 10, estimatedUniqueReach: t.reach, tradeoffs: describe(t, budget),
    hasEstimatedRates: t.members.some(m => m.creator.rateType === "estimated")
  }));
}

function describe(t: Team, budget: number) {
  const left = budget - t.cost, hoods = uniq(t.members.map(m => m.creator.hood));
  const parts = [`Spends $${t.cost} of $${budget}${left ? ` ($${left} left)` : ""}.`];
  if (t.members.length === 1) parts.push(`Strongest single fit at ${t.avgScore}/100; reaches one audience deeply.`);
  else parts.push(`Covers ${hoods.length} neighborhood${hoods.length > 1 ? "s" : ""} (${hoods.join(", ")}), average fit ${t.avgScore}/100.`);
  if (t.members.length > 1) parts.push(t.avgOv < 0.2 ? "Little audience overlap between them." : "Some of their followers overlap, so reach is counted once.");
  return parts.join(" ");
}

export function estimateRate(followers: number, eng?: number) {
  const base = 25 + (followers / 1000) * 18 * (eng ? Math.min(1.4, Math.max(0.7, eng / 0.05)) : 1);
  return Math.max(40, Math.min(450, Math.round(base / 5) * 5));
}

export function draftProposal(businessName: string, businessHood: string, brief: CampaignBrief, c: Creator, m: CreatorMatch, fee = c.rate) {
  const top = [...m.factors].sort((a, z) => z.weight * z.score - a.weight * a.score).slice(0, 2).map(f => f.evidence.toLowerCase());
  return `Hi ${c.name.split(" ")[0]}! I own ${businessName} on ${businessHood}. ${brief.objective}\n\nWe picked you because your profile ${top[0].startsWith("reaches") ? "" : "shows you "}${top[0]} and ${top[1]}.\n\nWould you post ${brief.deliverables.join(" and ")} (${brief.timeline.toLowerCase()}) for $${fee}?`;
}
