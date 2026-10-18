import { body, route } from "@/lib/server/http";
import { HttpError } from "@/lib/server/db";
import { parseCampaign } from "@/lib/server/gemini";
import { clampText } from "@/lib/server/safety";

// POST { prompt } → { brief, source: "gemini" | "heuristic" }
export const POST = route(async req => {
  const { prompt } = await body<{ prompt?: string }>(req);
  const text = clampText(prompt, 1500).trim();
  if (!text) throw new HttpError(400, "Tell us what you're promoting");
  return parseCampaign(text);
});
