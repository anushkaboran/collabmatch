import { route } from "@/lib/server/http";
import { getBusinesses } from "@/lib/server/db";

// GET → Business[]
export const GET = route(async () => getBusinesses());
