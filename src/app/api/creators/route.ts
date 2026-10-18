import { route } from "@/lib/server/http";
import { getCreators } from "@/lib/server/db";

// GET → Creator[] (persona picker, debugging)
export const GET = route(async () => getCreators());
