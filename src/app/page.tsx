"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, session } from "@/lib/api";
import { EXAMPLE_PROMPTS } from "@/mocks/data";
import Stage from "@/components/Stage";
import { Icon, Photo, Spinner, useToast } from "@/components/ui";

const SPOTS = [["/img/cafe4.jpg", "Cafés"], ["/img/food2.jpg", "Restaurants"], ["/img/gym1.jpg", "Studios & gyms"], ["/img/beauty1.jpg", "Beauty & boutiques"]];

export default function BusinessHome() {
  const router = useRouter();
  const toast = useToast();
  const [prompt, setPrompt] = useState<string>(EXAMPLE_PROMPTS[0].text);
  const [busy, setBusy] = useState(false);

  async function run(text = prompt) {
    const p = text.trim();
    if (!p) { toast("Tell us what you're promoting first"); return; }
    setBusy(true);
    try {
      const { brief, source } = await api.parseCampaign(p);
      const campaign = await api.createCampaign({ businessId: session.businessId(), prompt: p, brief, briefSource: source });
      router.push(`/business/campaigns/${campaign.id}`);
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <section className="hero">
        <div className="hero-copy">
          <h1>Every neighborhood spot deserves its crowd.</h1>
          <p className="lead">Tell us what you&apos;re promoting. We&apos;ll find the local creators whose followers are your next regulars, within your budget.</p>
          <form className="ask" onSubmit={e => { e.preventDefault(); run(); }}>
            <label htmlFor="prompt" className="sr-only">What are you promoting?</label>
            <textarea id="prompt" rows={3} value={prompt} onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }} />
            <button type="submit" className="go" disabled={busy}>{busy ? <><Spinner />Matching</> : <><Icon name="spark" />Find my creators</>}</button>
          </form>
          <div className="quick">
            <span>Try one:</span>
            {EXAMPLE_PROMPTS.map((e, i) => (
              <button key={e.label} type="button" className={`q${i}`} disabled={busy} onClick={() => { setPrompt(e.text); run(e.text); }}>
                <span className="ic"><Icon name={e.icon} size={15} /></span>{e.label}
              </button>
            ))}
          </div>
        </div>
        <Stage kind="business" />
      </section>

      <section className="how" aria-label="How it works">
        <div><span className="n k0">1</span><p><b>Say it in one line</b><span>What, who, where, how much</span></p></div>
        <div><span className="n k1">2</span><p><b>Get your creator team</b><span>Best mix for your budget</span></p></div>
        <div><span className="n k2">3</span><p><b>Invite in one tap</b><span>We write the messages</span></p></div>
      </section>

      <section className="spots" aria-label="Made for local businesses">
        {SPOTS.map(([src, label]) => <figure key={label}><Photo src={src} alt={label} /><figcaption>{label}</figcaption></figure>)}
      </section>

      <section className="quote">
        <div className="shop"><Photo src="/img/cafe4.jpg" alt="A neighborhood café" /></div>
        <p>Big brands buy reach. Small businesses need neighbors who show up.<cite>Why we built CollabMatch</cite></p>
      </section>
    </div>
  );
}
