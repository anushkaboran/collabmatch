"use client";
import { useState } from "react";
import type { CollaborationView, Creator } from "@/lib/types";
import { scoreCreator } from "@/lib/engine";
import { Avatar, Icon, Photo, kfmt } from "./ui";

/** The offer as a creator sees it. Used in the creator inbox and on the public invite-link page. */
export function OfferCard({ x, onAccept, onDecline, onCounter, onAdvance, acceptLabel }: {
  x: CollaborationView;
  onAccept: () => void; onDecline: () => void; onCounter: (fee: number, note: string) => void;
  onAdvance?: (to: "in_progress" | "submitted") => void; acceptLabel?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [fee, setFee] = useState(x.offeredFee + 20);
  const [note, setNote] = useState("");
  const [showMsg, setShowMsg] = useState(false);
  // "Why they picked you" uses the same evidence the business saw.
  const m = scoreCreator(x.creator, x.campaign.brief);
  const why = [...m.factors].sort((a, z) => z.weight * z.score - a.weight * a.score).slice(0, 3);
  const cls: Record<string, string> = { audience: "t-aud", niche: "t-niche", location: "t-place" };
  const st = x.status;
  return (
    <article className="invite">
      <div className="invite-top">
        <div className="shop"><Photo src={x.business.photo} alt={x.business.name} /></div>
        <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
          <span className="small" style={{ fontWeight: 800, opacity: 0.9 }}>New offer · {x.matchScore} fit</span>
          <h2>{x.business.name}</h2>
          <span className="small" style={{ opacity: 0.9 }}>{x.campaign.brief.title}</span>
        </div>
        <div className="fee">${st === "countered" ? x.counterFee : x.offeredFee}</div>
      </div>
      <div className="invite-body">
        <div className="deliver">
          <div style={{ background: "var(--violet-soft)", color: "var(--violet)" }}>1 video<span>short-form</span></div>
          <div style={{ background: "var(--pink-soft)", color: "var(--pink)" }}>2 stories<span>Instagram</span></div>
          <div style={{ background: "var(--orange-soft)", color: "var(--orange)" }}>{x.campaign.brief.timeline.split(",")[0]}<span>when</span></div>
        </div>
        <div className="groups">{why.map(f => <span key={f.key} className={`chip solo ${cls[f.key] ?? "t-plat"}`}>{f.evidence}</span>)}</div>
        {showMsg ? <div className="msg">{x.proposal}</div> : <button type="button" className="link" style={{ justifySelf: "start" }} onClick={() => setShowMsg(true)}>Read their message</button>}

        {st === "invited" && !asking && (
          <div className="btns">
            <button type="button" className="cta green" onClick={onAccept}>{acceptLabel ?? `Accept $${x.offeredFee}`}</button>
            <button type="button" className="btn" onClick={() => setAsking(true)}>Ask for more</button>
            <button type="button" className="btn" onClick={onDecline}>Pass</button>
          </div>
        )}
        {st === "invited" && asking && (
          <form className="row" style={{ alignItems: "flex-end" }} onSubmit={e => { e.preventDefault(); if (fee > 0) onCounter(fee, note); setAsking(false); }}>
            <label className="f" htmlFor={`ct-${x.id}`} style={{ width: 110 }}>Your fee<input type="number" id={`ct-${x.id}`} value={fee} min={1} onChange={e => setFee(Number(e.target.value))} /></label>
            <label className="f" htmlFor={`cn-${x.id}`} style={{ flex: 1, minWidth: 150 }}>Note<input type="text" id={`cn-${x.id}`} placeholder="I'll add a carousel" value={note} onChange={e => setNote(e.target.value)} /></label>
            <button type="submit" className="btn fill">Send</button>
            <button type="button" className="btn" onClick={() => setAsking(false)}>Cancel</button>
          </form>
        )}
        {st === "countered" && <div className="note warn">You asked for ${x.counterFee} · waiting for {x.business.name}</div>}
        {st === "accepted" && <><div className="note good">You&apos;re in!</div>{onAdvance && <button type="button" className="cta" onClick={() => onAdvance("in_progress")}>Start creating</button>}</>}
        {st === "in_progress" && onAdvance && <button type="button" className="cta" onClick={() => onAdvance("submitted")}>My posts are live</button>}
        {(st === "submitted" || st === "completed") && <div className="note good">{st === "completed" ? "Done · thanks for the collab!" : "Posted · the business will confirm and pay you"}</div>}
        {st === "declined" && <div className="note bad">You passed on this offer</div>}
      </div>
    </article>
  );
}

/** "Here's what we learned" profile built from Instagram. */
export function ProfileCard({ c, onRate }: { c: Creator; onRate: (rate: number) => void }) {
  const [rate, setRate] = useState(c.rate);
  const range = c.suggestedRateRange;
  return (
    <section className="panel">
      <div className="profile-head">
        <Avatar creator={c} size="lg" />
        <div style={{ display: "grid", gap: 6, flex: "1 1 200px", minWidth: 0 }}>
          <h2>{c.name}</h2>
          <div className="row" style={{ gap: 6 }}>
            {c.verified ? <span className="chip solo t-place"><Icon name="check" size={15} />Verified via Instagram</span> : <span className="chip solo" style={{ background: "var(--sunk)", color: "var(--muted)" }}>Self-reported</span>}
            <span className="chip solo t-place"><Icon name="pin" size={15} />{c.hood}</span>
          </div>
        </div>
        <label className="f" htmlFor="me-rate" style={{ width: 140 }}>Your rate
          <input type="number" id="me-rate" min={20} step={5} value={rate} onChange={e => setRate(Number(e.target.value))} onBlur={() => rate > 0 && rate !== c.rate && onRate(rate)} />
          {range && <span className="tiny">Similar: ${range[0]}–{range[1]}</span>}
        </label>
      </div>
      <div className="stats">
        <div className="ts" style={{ background: "var(--violet-soft)", color: "var(--violet)" }}><b>{kfmt(c.followers)}</b><span>followers</span></div>
        <div className="ts" style={{ background: "var(--pink-soft)", color: "var(--pink)" }}><b>{c.engagementRate ? `${(c.engagementRate * 100).toFixed(1)}%` : "–"}</b><span>engagement</span></div>
        <div className="ts" style={{ background: "var(--orange-soft)", color: "var(--orange)" }}><b>{c.postsPerWeek ? `${c.postsPerWeek}×` : "–"}</b><span>posts a week</span></div>
      </div>
      <div className="posts">{c.topPosts.slice(0, 6).map((p, i) => <div key={p.thumbnailUrl + i} className="t"><Photo src={p.thumbnailUrl} alt={p.caption} /></div>)}</div>
      <div className="groups">
        {(c.topicCounts ?? c.niches.map(n => ({ label: n, count: 0 }))).map(t => <span key={t.label} className="chip solo t-niche">{t.label}{t.count ? ` · ${t.count}` : ""}</span>)}
        {c.contentStyles.map(s => <span key={s} className="chip solo t-plat">{s}</span>)}
      </div>
      {(c.audienceCities || c.audienceAges) && (
        <div className="grid2">
          {c.audienceCities && <div className="hbars"><b className="small">Followers live in</b>{c.audienceCities.map(a => <div key={a.label} className="hbar"><span>{a.label}</span><span className="fb"><i style={{ width: `${a.pct}%`, background: "var(--green)" }} /></span><span>{a.pct}%</span></div>)}</div>}
          {c.audienceAges && <div className="hbars"><b className="small">Their ages</b>{c.audienceAges.map(a => <div key={a.label} className="hbar"><span>{a.label}</span><span className="fb"><i style={{ width: `${a.pct}%`, background: "var(--pink)" }} /></span><span>{a.pct}%</span></div>)}</div>}
        </div>
      )}
      {c.followers < 100 && <p className="tiny">Not enough followers yet for audience data. We matched you on your posts.</p>}
    </section>
  );
}

export function ConsentCard({ handle, busy, onAllow, onCancel }: { handle: string; busy: boolean; onAllow: () => void; onCancel: () => void }) {
  if (busy) return <div className="consent"><div className="row"><span className="spin" style={{ color: "var(--pink)" }} /><b>Reading your posts…</b></div></div>;
  return (
    <div className="consent">
      <h3>Connect {handle}</h3>
      <div className="perm">
        <div><span className="ic" style={{ background: "var(--violet-soft)", color: "var(--violet)" }}><Icon name="eye" /></span>Your posts and captions</div>
        <div><span className="ic" style={{ background: "var(--pink-soft)", color: "var(--pink)" }}><Icon name="people" /></span>Follower count and audience</div>
        <div><span className="ic" style={{ background: "var(--green-soft)", color: "var(--green)" }}><Icon name="lock" /></span>Never posts or reads messages</div>
      </div>
      <div className="row"><button type="button" className="btn fill" onClick={onAllow}>Allow</button><button type="button" className="btn" onClick={onCancel}>Not now</button><span className="tiny">Demo stand-in for Instagram&apos;s sign-in</span></div>
    </div>
  );
}
