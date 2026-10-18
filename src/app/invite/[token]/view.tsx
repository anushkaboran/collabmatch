"use client";
import { useCallback, useEffect, useState } from "react";
import { api, instagramLoginUrl, USE_MOCKS } from "@/lib/api";
import type { CollaborationView } from "@/lib/types";
import { ConsentCard, OfferCard } from "@/components/creator";
import { ErrorBox, useToast } from "@/components/ui";

/** Public page a creator opens from a DM (spec 5.4). They answer by connecting Instagram, no password. */
export default function InviteView({ token }: { token: string }) {
  const toast = useToast();
  const [x, setX] = useState<CollaborationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<null | "ask" | "busy">(null);

  const load = useCallback(async () => {
    try { setX(await api.getInvite(token)); setError(null); } catch (e) { setError((e as Error).message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function respond(action: "accept" | "decline" | "counter", fee?: number, note?: string) {
    try { await api.respondInvite(token, action, fee, note); await load(); toast(action === "accept" ? "You're in! Your profile is verified" : action === "decline" ? "Passed" : "Sent"); }
    catch (e) { toast((e as Error).message); }
  }

  if (error) return <div className="wrap mid"><ErrorBox message={error} onRetry={load} /></div>;
  if (!x) return <div className="wrap mid"><div className="skeleton" style={{ height: 420 }} /></div>;

  return (
    <div className="wrap mid">
      <div style={{ display: "grid", gap: 6 }}>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)" }}>{x.business.name} wants to work with you</h1>
        <p className="lead">They found {x.creator.handle} and think your followers would love them. Connect Instagram to answer.</p>
      </div>
      {consent && <ConsentCard handle={x.creator.handle} busy={consent === "busy"} onCancel={() => setConsent(null)}
        onAllow={async () => { setConsent("busy"); await respond("accept"); setConsent(null); }} />}
      <OfferCard x={x}
        acceptLabel={x.creator.claimed ? undefined : "Continue with Instagram to accept"}
        onAccept={() => { if (x.creator.claimed) respond("accept"); else if (USE_MOCKS) setConsent("ask"); else window.location.href = instagramLoginUrl(token); }}
        onDecline={() => respond("decline")}
        onCounter={(fee, note) => respond("counter", fee, note)} />
    </div>
  );
}
