import { route } from "@/lib/server/http";
import { resetAll } from "@/lib/server/db";

// POST → wipe campaigns and invites, reload the 14 sample creators and 3 businesses ("Start over")
export const POST = route(async () => ({ ok: true, ...(await resetAll()) }));
