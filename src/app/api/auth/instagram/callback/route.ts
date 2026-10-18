import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { route } from "@/lib/server/http";
import { getInviteView } from "@/lib/server/db";
import { exchangeCode, syncCreator } from "@/lib/server/instagram";
import { scrub } from "@/lib/server/safety";

// GET ?code&state from Instagram → token → profile, posts, audience → Gemini analysis → verified creator.
// Then back to the creator page (or the invite page the creator came from).
export const GET = route(async req => {
  const url = new URL(req.url);
  const fail = (msg: string) => NextResponse.redirect(new URL(`/creator?error=${encodeURIComponent(msg)}`, req.url));
  if (url.searchParams.get("error")) return fail("Instagram login was cancelled");

  const code = url.searchParams.get("code");
  let state: { n?: string; invite?: string } = {};
  try { state = JSON.parse(Buffer.from(url.searchParams.get("state") ?? "", "base64url").toString()); } catch { /* invalid */ }
  const jar = await cookies();
  if (!code || !state.n || jar.get("ig_state")?.value !== state.n) return fail("Login expired. Try again.");

  try {
    const token = await exchangeCode(code);
    let claim: string | undefined;
    if (state.invite) {
      const view = await getInviteView(state.invite).catch(() => null);
      if (view && !view.creator.claimed) claim = view.creatorId; // a creator a business added from social media claims their profile
    }
    const creator = await syncCreator(token, claim);
    const dest = state.invite ? `/invite/${encodeURIComponent(state.invite)}` : `/creator?creatorId=${encodeURIComponent(creator.id)}`;
    const res = NextResponse.redirect(new URL(dest, req.url));
    res.cookies.delete("ig_state");
    return res;
  } catch (err) {
    console.error("[instagram]", scrub(err));
    return fail("We couldn't read your Instagram account. Make sure it's a creator or business account.");
  }
});
