"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, session } from "@/lib/api";
import type { Campaign, CampaignBrief, CollaborationView, MatchesResult, Platform } from "@/lib/types";
import { AddFromSocial, BriefStrip, Loading, MatchCard, PreviewModal, TeamPanel, Tracker } from "@/components/campaign";
import { ErrorBox, Spinner, useInterval, useToast } from "@/components/ui";

export default function CampaignView({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [collabs, setCollabs] = useState<CollaborationView[]>([]);
  const [result, setResult] = useState<MatchesResult | null>(null);
  const [planIdx, setPlanIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<null | { loading: boolean }>(null);
  const [drafts, setDrafts] = useState<Record<string, { fee: number; msg: string }>>({});
  const collabsRef = useRef<CollaborationView[]>([]);
  useEffect(() => { collabsRef.current = collabs; }, [collabs]);

  const loadMatches = useCallback(async (keepSelection = false) => {
    const r = await api.getMatches(id);
    setResult(r);
    if (!keepSelection) { setPlanIdx(0); setSelected(r.teams[0]?.creatorIds ?? []); setDrafts({}); }
  }, [id]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { campaign, collaborations } = await api.getCampaign(id);
      setCampaign(campaign); setCollabs(collaborations); setPrompt(campaign.prompt);
      await loadMatches();
    } catch (e) { setError((e as Error).message); }
  }, [id, loadMatches]);

  useEffect(() => { load(); }, [load]);

  // Live status: poll every 3 s (spec 4.3) and react instantly to changes from another tab in mock mode.
  const refreshCollabs = useCallback(async () => {
    if (!campaign) return;
    const next = await api.listCollaborations({ campaignId: id });
    for (const n of next) {
      const p = collabsRef.current.find(x => x.id === n.id);
      if (p && p.status !== n.status) toast(`${n.creator.name.split(" ")[0]} ${n.status === "countered" ? "asked for more" : n.status === "accepted" ? "accepted" : n.status === "declined" ? "passed" : "updated"}`);
    }
    collabsRef.current = next;
    setCollabs(next);
  }, [campaign, id, toast]);
  useInterval(refreshCollabs, 3000);
  useEffect(() => api.subscribe(refreshCollabs), [refreshCollabs]);

  const byId = useCallback((cid: string) => result?.matches.find(m => m.creator.id === cid)?.creator, [result]);
  const matchOf = useCallback((cid: string) => result?.matches.find(m => m.creator.id === cid), [result]);
  const plan = result?.teams[planIdx];
  const custom = !!plan && (selected.length !== plan.creatorIds.length || plan.creatorIds.some(x => !selected.includes(x)));
  const fit = useMemo(() => result?.matches.filter(m => m.eligible) ?? [], [result]);
  const out = useMemo(() => result?.matches.filter(m => !m.eligible) ?? [], [result]);

  async function patchBrief(patch: Partial<CampaignBrief>) {
    try { const c = await api.updateCampaign(id, patch); setCampaign(c); await loadMatches(); }
    catch (e) { toast((e as Error).message); }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setSearching(true);
    try {
      const { brief, source } = await api.parseCampaign(prompt.trim());
      const c = await api.createCampaign({ businessId: session.businessId(), prompt: prompt.trim(), brief, briefSource: source });
      router.push(`/business/campaigns/${c.id}`);
    } catch (x) { toast((x as Error).message); setSearching(false); }
  }

  async function ensureDrafts() {
    const missing = selected.filter(cid => !drafts[cid]);
    if (!missing.length) return drafts;
    const made = await Promise.all(missing.map(async cid => [cid, { fee: byId(cid)!.rate, msg: (await api.draftProposal(id, cid)).proposal }] as const));
    const next = { ...drafts, ...Object.fromEntries(made) };
    setDrafts(next);
    return next;
  }

  async function openPreview() {
    setPreview({ loading: true });
    try { await ensureDrafts(); setPreview({ loading: false }); } catch (e) { toast((e as Error).message); setPreview(null); }
  }

  async function send() {
    setSending(true);
    try {
      const d = await ensureDrafts();
      await api.sendInvites(id, selected.map(cid => ({ creatorId: cid, proposal: d[cid].msg, offeredFee: d[cid].fee })));
      setPreview(null);
      toast(`Invited ${selected.length} creator${selected.length === 1 ? "" : "s"}`);
      setCollabs(await api.listCollaborations({ campaignId: id }));
    } catch (e) { toast((e as Error).message); }
    finally { setSending(false); }
  }

  async function addCreator(v: { handle: string; platform: Platform; followers: number; notes: string }) {
    const c = await api.importCreator(v);
    await loadMatches(true);
    toast(`${c.handle} added · about $${c.rate}`);
  }

  async function answerCounter(c: CollaborationView, pay: boolean) {
    try { await api.updateCollaboration(c.id, { status: pay ? "accepted" : "invited" }); toast(pay ? `Agreed at $${c.counterFee}` : "Kept your offer"); await refreshCollabs(); }
    catch (e) { toast((e as Error).message); }
  }
  async function complete(c: CollaborationView) {
    try { await api.updateCollaboration(c.id, { status: "completed" }); toast("Marked as done"); await refreshCollabs(); } catch (e) { toast((e as Error).message); }
  }

  if (error) return <div className="wrap mid"><ErrorBox message={error} onRetry={load} /></div>;
  if (!campaign || !result) return <div className="wrap"><div className="skeleton" style={{ height: 64 }} /><div className="skeleton" style={{ height: 120 }} /><Loading /></div>;

  const invited = collabs.length > 0;
  return (
    <div className="wrap">
      <form className="searchbar" onSubmit={search}>
        <label htmlFor="prompt" className="sr-only">What are you promoting?</label>
        <input type="text" id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} />
        <button type="submit" className="go" disabled={searching}>{searching ? <Spinner /> : "Search again"}</button>
      </form>

      <BriefStrip brief={campaign.brief} source={campaign.briefSource}
        onBudget={v => patchBrief({ budget: v })}
        onChips={(field, values) => patchBrief({ [field]: values } as Partial<CampaignBrief>)} />

      <div className="results">
        <section className="panel sticky" aria-labelledby="team-h">
          {invited
            ? <Tracker collabs={collabs} budget={campaign.brief.budget} onAnswerCounter={answerCounter} onComplete={complete} />
            : <TeamPanel plans={result.teams} planIdx={planIdx} custom={custom} selected={selected} budget={campaign.brief.budget} byId={byId} matchOf={matchOf} busy={sending}
                onPlan={i => { setPlanIdx(i); setSelected(result.teams[i].creatorIds); }} onInvite={send} onPreview={openPreview} />}
        </section>

        <section style={{ display: "grid", gap: 14, minWidth: 0 }} aria-labelledby="m-h">
          <div className="row between"><h2 id="m-h">Best matches</h2><span className="tiny">{fit.length} fits · ranked by fit, not followers</span></div>
          {fit.length === 0 && <section className="panel"><b>No creators fit yet.</b><p className="muted">Raise the budget or add a topic above.</p></section>}
          <div className="list">
            {fit.map(m => <MatchCard key={m.creator.id} m={m} brief={campaign.brief} picked={selected.includes(m.creator.id)} locked={invited}
              onToggle={() => setSelected(s => s.includes(m.creator.id) ? s.filter(x => x !== m.creator.id) : [...s, m.creator.id])} />)}
          </div>
          {!invited && <AddFromSocial onAdd={addCreator} />}
          {out.length > 0 && (
            <details className="more"><summary>{out.length} not a fit</summary>
              <div className="list">{out.map(m => <MatchCard key={m.creator.id} m={m} brief={campaign.brief} picked={false} locked onToggle={() => {}} />)}</div>
            </details>
          )}
        </section>
      </div>

      {preview && (
        <PreviewModal creators={selected.map(byId).filter((c): c is NonNullable<typeof c> => !!c)} drafts={drafts} loading={preview.loading}
          onChange={(cid, d) => setDrafts(x => ({ ...x, [cid]: d }))} onClose={() => setPreview(null)} onSend={send} />
      )}
    </div>
  );
}
