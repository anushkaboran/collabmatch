import { body, route } from "@/lib/server/http";
import { findCreatorByHandle, HttpError } from "@/lib/server/db";
import { claimForDemo } from "@/lib/server/services";

// POST { handle } → a sample connected creator. Fallback for the demo if live Instagram login isn't available.
export const POST = route(async req => {
  const { handle } = await body<{ handle?: string }>(req);
  const c = await findCreatorByHandle(handle || "@maya.eats.sea");
  if (!c) throw new HttpError(404, "No sample creator with that handle");
  return claimForDemo(c.id);
});
