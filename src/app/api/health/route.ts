import { route } from "@/lib/server/http";
import { backend } from "@/lib/server/db";
import { hasGemini } from "@/lib/server/gemini";
import { hasInstagram } from "@/lib/server/instagram";

// GET → which real services are switched on (no secrets)
export const GET = route(async () => ({ ok: true, database: backend(), gemini: hasGemini(), instagram: hasInstagram() }));
