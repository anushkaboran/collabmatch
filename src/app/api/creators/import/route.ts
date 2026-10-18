import { body, route } from "@/lib/server/http";
import { importCreator } from "@/lib/server/services";

// POST { handle, platform, followers, notes } → Creator (unverified, estimated rate)
export const POST = route(async req => importCreator(await body(req)));
