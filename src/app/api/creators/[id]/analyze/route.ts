import { route } from "@/lib/server/http";
import { getCreator, upsertCreator } from "@/lib/server/db";
import { analyzeCreator } from "@/lib/server/gemini";

// POST → Creator with topics, style and audience re-read from their saved posts by Gemini
export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const c = await getCreator((await params).id);
  const a = await analyzeCreator({ captions: c.topPosts.map(p => p.caption).filter(Boolean), bio: c.bio, mediaTypes: [] });
  return upsertCreator({ ...c, niches: a.niches, contentStyles: a.contentStyles, audienceTags: a.audienceTags, topicCounts: a.topicCounts });
});
