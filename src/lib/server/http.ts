// Shared route-handler wrapper: request-time only, JSON errors as { error } with the right status.
import { connection } from "next/server";
import { ensureSeeded, HttpError } from "./db";
import { scrub } from "./safety";

export function route<C>(fn: (req: Request, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C) => {
    await connection(); // never prerender API responses
    try {
      await ensureSeeded();
      const data = await fn(req, ctx);
      return data instanceof Response ? data : Response.json(data);
    } catch (err) {
      if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
      console.error("[api]", scrub(err));
      return Response.json({ error: "Something went wrong on our side. Try again." }, { status: 500 });
    }
  };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { throw new HttpError(400, "Send a JSON body"); }
}
