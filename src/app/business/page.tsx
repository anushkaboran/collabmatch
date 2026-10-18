"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, session } from "@/lib/api";
import type { Campaign, CollaborationView } from "@/lib/types";
import { ErrorBox, Photo } from "@/components/ui";

const PHOTO: Record<string, string> = { "cafés & coffee": "/img/cafe2.jpg", fitness: "/img/gym1.jpg", fashion: "/img/beauty2.jpg", food: "/img/food1.jpg" };

export default function Dashboard() {
  const [rows, setRows] = useState<{ c: Campaign; collabs: CollaborationView[] }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const cs = await api.listCampaigns(session.businessId());
        setRows(await Promise.all(cs.map(async c => ({ c, collabs: await api.listCollaborations({ campaignId: c.id }) }))));
      } catch (e) { setError((e as Error).message); }
    })();
  }, []);
  if (error) return <div className="wrap mid"><ErrorBox message={error} /></div>;
  return (
    <div className="wrap mid">
      <div className="row between"><h1 style={{ fontSize: 40 }}>My campaigns</h1><Link href="/" className="btn fill">New campaign</Link></div>
      {!rows ? <div className="skeleton" style={{ height: 96 }} /> : rows.length === 0 ? (
        <section className="panel empty"><h2>No campaigns yet</h2><p className="muted">Describe what you&apos;re promoting and we&apos;ll find your creators.</p><Link href="/" className="btn fill">Start one</Link></section>
      ) : (
        <div className="dash-list">
          {rows.map(({ c, collabs }) => {
            const yes = collabs.filter(x => ["accepted", "in_progress", "submitted", "completed"].includes(x.status)).length;
            const photo = PHOTO[c.brief.niches.find(n => PHOTO[n]) ?? ""] ?? "/img/cafe4.jpg";
            return (
              <Link key={c.id} href={`/business/campaigns/${c.id}`} className="dash-row">
                <span className="thumb"><Photo src={photo} /></span>
                <span style={{ minWidth: 0, display: "grid", gap: 4 }}><b>{c.brief.title}</b><span className="tiny">{c.brief.location} · ${c.brief.budget} · {new Date(c.createdAt).toLocaleDateString()}</span></span>
                <span className={`pill ${collabs.length ? "p-accepted" : "p-invited"}`}>{collabs.length ? `${yes} of ${collabs.length} said yes` : "Not sent"}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
