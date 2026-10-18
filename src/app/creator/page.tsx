"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, instagramLoginUrl, session, USE_MOCKS } from "@/lib/api";
import type { CollaborationView, CollabStatus, Creator } from "@/lib/types";
import Stage from "@/components/Stage";
import { ConsentCard, OfferCard, ProfileCard } from "@/components/creator";
import { ErrorBox, Photo, useInterval, useToast } from "@/components/ui";

export default function CreatorPage() {
  const toast = useToast();
  const [creatorId, setCreatorId] = useState<string | null | undefined>(undefined); // undefined = not read yet
  const [creator, setCreator] = useState<Creator | null>(null);
  const [offers, setOffers] = useState<CollaborationView[]>([]);
  const [stage, setStage] = useState<"join" | "consent" | "loading">("join");
  const [error, setError] = useState<string | null>(null);

  // The Instagram callback redirects here with ?creatorId=…; otherwise use the saved session.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("creatorId");
    const err = params.get("error");
    if (err) { toast(err); window.history.replaceState(null, "", "/creator"); }
    if (fromUrl) { session.setCreatorId(fromUrl); window.history.replaceState(null, "", "/creator"); }
    setCreatorId(fromUrl ?? session.getCreatorId());
  }, []);

  const load = useCallback(async () => {
    if (!creatorId) return;
    try {
      const [c, o] = await Promise.all([api.getCreator(creatorId), api.listCollaborations({ creatorId })]);
      setCreator(c); setOffers(o); setError(null);
    } catch (e) { setError((e as Error).message); }
  }, [creatorId]);
  useEffect(() => { load(); }, [load]);
  useInterval(() => { if (creatorId) api.listCollaborations({ creatorId }).then(setOffers).catch(() => {}); }, 3000);
  useEffect(() => api.subscribe(load), [load]);

  function connect() {
    if (USE_MOCKS) setStage("consent");
    else window.location.href = instagramLoginUrl();
  }
  async function allow() {
    setStage("loading");
    try {
      const c = await api.demoConnect("@maya.eats.sea");
      session.setCreatorId(c.id); setCreatorId(c.id);
      toast("Verified via Instagram");
    } catch (e) { toast((e as Error).message); setStage("join"); }
  }

  async function move(x: CollaborationView, status: CollabStatus, extra?: { counterFee?: number; counterNote?: string }, msg?: string) {
    try { await api.updateCollaboration(x.id, { status, ...extra }); if (msg) toast(msg); await load(); }
    catch (e) { toast((e as Error).message); }
  }

  if (creatorId === undefined) return null;

  if (!creatorId) {
    return (
      <div className="wrap">
        <section className="hero">
          <div className="hero-copy">
            <h1>Get paid to post about places you already love.</h1>
            <p className="lead">Connect once. We match you on what you post, not how many followers you have.</p>
            {stage === "join" ? (
              <>
                <button type="button" className="ig" onClick={connect}><span className="glyph" aria-hidden="true" />Continue with Instagram</button>
                <span className="tiny">TikTok coming soon{!USE_MOCKS && <> · <button type="button" className="link" onClick={allow}>use a demo profile</button></>}</span>
              </>
            ) : <ConsentCard handle="@maya.eats.sea" busy={stage === "loading"} onAllow={allow} onCancel={() => setStage("join")} />}
          </div>
          <Stage kind="creator" />
        </section>
      </div>
    );
  }

  if (error) return <div className="wrap mid"><ErrorBox message={error} onRetry={load} /></div>;
  if (!creator) return <div className="wrap mid"><div className="skeleton" style={{ height: 360 }} /><div className="skeleton" style={{ height: 420 }} /></div>;

  const open = offers.filter(o => o.status !== "declined" && o.status !== "completed");
  const past = offers.filter(o => o.status === "declined" || o.status === "completed");
  return (
    <div className="wrap mid">
      {open.length ? open.map(x => (
        <OfferCard key={x.id} x={x}
          onAccept={() => move(x, "accepted", undefined, `Accepted! ${x.business.name} sees it now`)}
          onDecline={() => move(x, "declined", undefined, "Passed")}
          onCounter={(fee, note) => move(x, "countered", { counterFee: fee, counterNote: note }, `Sent to ${x.business.name}`)}
          onAdvance={to => move(x, to, undefined, to === "in_progress" ? "Have fun creating" : "Nice! Marked as posted")} />
      )) : (
        <section className="panel empty">
          <div style={{ width: 140, height: 140, borderRadius: 24, overflow: "hidden" }}><Photo src="/img/cafe4.jpg" alt="" /></div>
          <h2>No offers yet</h2>
          <p className="muted">Offers from local spots land here.</p>
          <Link href="/" className="btn fill">Send one as the café</Link>
        </section>
      )}
      <ProfileCard c={creator} onRate={async r => { try { setCreator(await api.updateCreator(creator.id, { rate: r, rateType: "quoted" })); toast("Rate saved"); } catch (e) { toast((e as Error).message); } }} />
      {past.length > 0 && <p className="tiny">{past.length} past offer{past.length === 1 ? "" : "s"}</p>}
      <button type="button" className="link" style={{ justifySelf: "center" }} onClick={() => { session.setCreatorId(null); setCreatorId(null); setCreator(null); setStage("join"); }}>Sign out</button>
    </div>
  );
}
