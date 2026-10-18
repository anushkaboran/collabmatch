import type { Creator } from "@/lib/types";
import { body, route } from "@/lib/server/http";
import { getCreator, updateCreator } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

// GET → Creator
export const GET = route<Ctx>(async (_req, { params }) => getCreator((await params).id));

// PATCH editable fields (rate, topics, availability…) → Creator. Unknown fields are ignored.
export const PATCH = route<Ctx>(async (req, { params }) => updateCreator((await params).id, await body<Partial<Creator>>(req)));
