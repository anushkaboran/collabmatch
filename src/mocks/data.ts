// Synthetic seed data (spec section 13). Used by mock mode; Person A seeds the same records into Atlas.
import type { Business, Creator, Platform } from "@/lib/types";

export const NICHES = ["cafés & coffee", "food", "student life", "local discovery", "fitness", "fashion", "beauty", "nightlife", "family"];
export const AUDIENCES = ["college students", "young professionals", "foodies", "fitness fans", "fashion shoppers", "parents"];
export const PLATFORMS: Platform[] = ["instagram", "tiktok"];
export const CONTENT_TYPES = ["short-form video", "reviews", "photo posts", "day-in-the-life", "stories"];
export const METRO: Record<string, string[]> = { Seattle: ["Bellevue", "Redmond", "Tacoma", "Kirkland"] };

export const BUSINESSES: Business[] = [
  { id: "kettle", name: "Kettle & Leaf Café", category: "café", location: "Seattle", hood: "Capitol Hill", description: "Neighborhood café known for matcha and pastries.", photo: "/img/cafe4.jpg" },
  { id: "flow", name: "Flow Yoga Fremont", category: "fitness studio", location: "Seattle", hood: "Fremont", description: "Small yoga studio with drop-in classes.", photo: "/img/gym1.jpg" },
  { id: "thread", name: "Thread & Co.", category: "boutique", location: "Seattle", hood: "Capitol Hill", description: "Independent clothing boutique.", photo: "/img/beauty4.jpg" }
];

type Seed = [id: string, name: string, handle: string, hood: string, city: string, niches: string[], audience: string[], styles: string[], platforms: Platform[], followers: number, eng: number | null, rate: number, available: boolean, source: "instagram" | "self", photos: string[]];

const SEEDS: Seed[] = [
  ["maya", "Maya Chen", "@maya.eats.sea", "Capitol Hill", "Seattle", ["cafés & coffee", "food", "local discovery"], ["college students", "young professionals", "foodies"], ["short-form video", "reviews"], ["instagram", "tiktok"], 4200, 0.061, 120, true, "instagram", ["cafe2", "food1", "cafe3", "food2", "cafe4", "cafe1"]],
  ["jordan", "Jordan Reyes", "@jordan.udub", "U District", "Seattle", ["student life", "cafés & coffee"], ["college students"], ["short-form video", "day-in-the-life"], ["tiktok", "instagram"], 2800, 0.074, 100, true, "instagram", ["cafe3", "travel4"]],
  ["alex", "Alex Park", "@alexfindsballard", "Ballard", "Seattle", ["local discovery", "food"], ["young professionals", "foodies"], ["photo posts", "reviews", "short-form video"], ["instagram"], 3600, 0.052, 80, true, "instagram", ["cafe4", "food3"]],
  ["priya", "Priya Nair", "@priyasips", "Capitol Hill", "Seattle", ["cafés & coffee", "food"], ["young professionals", "foodies"], ["short-form video", "reviews"], ["instagram"], 5100, 0.048, 140, true, "instagram", ["cafe1", "food2"]],
  ["theo", "Theo Martin", "@theo.on.the.ave", "U District", "Seattle", ["student life", "local discovery"], ["college students"], ["stories", "day-in-the-life"], ["instagram"], 1900, null, 60, true, "self", ["travel2", "cafe3"]],
  ["kenji", "Kenji Watanabe", "@kenjibrews", "Fremont", "Seattle", ["cafés & coffee"], ["young professionals"], ["photo posts", "reviews"], ["instagram"], 12000, 0.031, 160, true, "instagram", ["cafe1", "cafe4"]],
  ["dana", "Dana Whitfield", "@dana.downtown", "Downtown", "Seattle", ["local discovery", "nightlife"], ["young professionals"], ["stories", "photo posts"], ["instagram"], 6400, 0.039, 110, true, "instagram", ["travel1", "food4"]],
  ["ava", "Ava Kim", "@avakim.studies", "U District", "Seattle", ["student life"], ["college students"], ["day-in-the-life", "short-form video"], ["tiktok"], 1500, null, 45, true, "self", ["travel4", "cafe2"]],
  ["sam", "Sam Okafor", "@samlifts.sea", "Fremont", "Seattle", ["fitness"], ["fitness fans", "young professionals"], ["short-form video"], ["instagram", "tiktok"], 8800, 0.044, 90, true, "instagram", ["gym3", "gym2"]],
  ["mia", "Mia Torres", "@miamakesmatcha", "Downtown", "Bellevue", ["cafés & coffee", "food"], ["college students", "foodies"], ["short-form video", "reviews"], ["tiktok", "instagram"], 18000, 0.057, 200, false, "instagram", ["cafe2", "food1"]],
  ["ruby", "Ruby Alvarez", "@rubyeatspdx", "Pearl District", "Portland", ["food", "cafés & coffee"], ["foodies"], ["reviews", "photo posts"], ["instagram"], 7300, 0.05, 90, true, "instagram", ["food2", "food3"]],
  ["lena", "Lena Brooks", "@lenastyle.la", "Silver Lake", "Los Angeles", ["fashion", "beauty"], ["fashion shoppers"], ["photo posts", "short-form video"], ["instagram", "tiktok"], 39000, 0.028, 400, true, "instagram", ["beauty2", "travel1"]],
  ["chris", "Chris Lee", "@chrisfamilyfun", "Proctor", "Tacoma", ["family", "food"], ["parents"], ["photo posts"], ["instagram"], 5200, 0.041, 70, true, "instagram", ["food1", "travel3"]],
  ["nora", "Nora Quinn", "@noraquinn.beauty", "Queen Anne", "Seattle", ["beauty"], ["young professionals", "fashion shoppers"], ["short-form video", "reviews"], ["tiktok"], 9700, 0.036, 85, true, "instagram", ["beauty1", "beauty2"]]
];

const COLORS = ["violet", "pink", "orange", "green", "blue"];
const CAPTIONS: Record<string, string> = {
  cafe1: "Espresso pull at a new spot", cafe2: "Latte art taste test", cafe3: "Rainy day cappuccino", cafe4: "Best café interiors in Seattle",
  food1: "Brunch for under $15", food2: "Pasta night", food3: "Chef's table preview", food4: "Plating like a pro",
  gym1: "Morning yoga flow", gym2: "Treadmill intervals", gym3: "Leg day", gym4: "New gym tour",
  travel1: "Road trip day", travel2: "Weekend getaway", travel3: "Pool day", travel4: "Study break at the airport",
  beauty1: "Skincare routine", beauty2: "Everyday makeup", beauty3: "Hair care favorites", beauty4: "Vanity refresh"
};

export const photoPost = (key: string) => ({ caption: CAPTIONS[key] ?? "", permalink: "#", thumbnailUrl: `/img/${key}.jpg` });

export const SEED_CREATORS: Creator[] = SEEDS.map(([id, name, handle, hood, city, niches, audience, styles, platforms, followers, eng, rate, available, source, photos], i) => ({
  id, name, handle, hood, location: city, serviceAreas: [hood, city],
  bio: `${niches[0]} creator in ${hood}`,
  niches, audienceTags: audience, audienceAgeRange: [18, 34], platforms, followers,
  engagementRate: eng ?? undefined, contentStyles: styles, rate, available,
  avatarColor: COLORS[i % COLORS.length],
  dataSource: source, verified: source === "instagram", connectedPlatforms: source === "instagram" ? ["instagram"] : [],
  socialUrl: `https://instagram.com/${handle.slice(1)}`,
  topPosts: photos.map(photoPost),
  rateType: "quoted", claimed: true,
  ...(id === "maya" ? {
    suggestedRateRange: [100, 140] as [number, number], postsPerWeek: 3,
    audienceCities: [{ label: "Seattle", pct: 61 }, { label: "Bellevue", pct: 9 }, { label: "Tacoma", pct: 4 }, { label: "Other", pct: 26 }],
    audienceAges: [{ label: "18–24", pct: 44 }, { label: "25–34", pct: 38 }, { label: "35–44", pct: 12 }, { label: "45+", pct: 6 }],
    topicCounts: [{ label: "Cafés & coffee", count: 9 }, { label: "Food", count: 7 }, { label: "Local spots", count: 5 }]
  } : {})
}));

export const EXAMPLE_PROMPTS = [
  { label: "Café · $300", icon: "cup", text: "I own a small coffee shop in Seattle. We're launching a seasonal matcha drink next month and have a $300 budget. We want to reach local college students and young professionals through Instagram and TikTok." },
  { label: "Yoga studio · $200", icon: "leaf", text: "Our yoga studio in Seattle has $200 to get young professionals to book a first class. Mostly Instagram." },
  { label: "Boutique · $450", icon: "bag", text: "I run a clothing boutique in Seattle with $450 to reach fashion shoppers on TikTok and Instagram." }
] as const;
