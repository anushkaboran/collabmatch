import { route } from "@/lib/server/http";
import { getInviteView } from "@/lib/server/db";

// GET → CollaborationView for the public invite-link page
export const GET = route<{ params: Promise<{ token: string }> }>(async (_req, { params }) => getInviteView((await params).token));
