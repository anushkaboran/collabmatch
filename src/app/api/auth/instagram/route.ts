import { NextResponse } from "next/server";
import { route } from "@/lib/server/http";
import { getInviteView, newId } from "@/lib/server/db";
import { authorizeUrl, hasInstagram } from "@/lib/server/instagram";
import { claimForDemo } from "@/lib/server/services";

// GET ?invite=<token> → redirect to Instagram's login. The invite token rides along in `state`;
// a random nonce in an httpOnly cookie guards the callback against CSRF.
// Without Instagram keys (local dev, demo fallback) it connects the sample creator instead.
export const GET = route(async req => {
  const url = new URL(req.url);
  const invite = url.searchParams.get("invite") ?? undefined;

  if (!hasInstagram()) {
    if (invite) {
      const view = await getInviteView(invite);
      await claimForDemo(view.creatorId);
      return NextResponse.redirect(new URL(`/invite/${encodeURIComponent(invite)}`, req.url));
    }
    const maya = await claimForDemo("maya");
    return NextResponse.redirect(new URL(`/creator?creatorId=${maya.id}`, req.url));
  }

  const nonce = newId();
  const state = Buffer.from(JSON.stringify({ n: nonce, invite })).toString("base64url");
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set("ig_state", nonce, { httpOnly: true, secure: url.protocol === "https:", sameSite: "lax", maxAge: 600, path: "/" });
  return res;
});
