import { route } from "@/lib/server/http";
import { getCampaign } from "@/lib/server/db";
import { matchesFor } from "@/lib/server/services";

// GET → { matches, teams }: Atlas pre-filter, 7-factor scoring, budget optimizer
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  return matchesFor(await getCampaign(id));
});
