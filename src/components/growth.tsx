"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "./ui";

const REF_KEY = "collabmatch-ref";

/** Creator side of the growth loop: a link a creator sends to a local spot they like. */
export function CreatorInviteCard({ creatorId }: { creatorId: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  async function copy() {
    const link = `${window.location.origin}/?ref=${encodeURIComponent(creatorId)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true); toast("Invite link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch { window.prompt("Copy this link:", link); }
  }
  return (
    <section className="panel refcard">
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <h2>Know a spot that should work with you?</h2>
        <p className="muted">Send them your link. You&apos;ll show up when they search.</p>
      </div>
      <button type="button" className="btn fill" onClick={copy}>{copied ? "Copied!" : "Copy invite link"}</button>
    </section>
  );
}

/** Business side: if someone arrived from a creator's link (/?ref=<creatorId>), say who sent them. */
export function RefBanner() {
  const [ref, setRef] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("ref");
    if (!r) return;
    setRef(r);
    try { localStorage.setItem(REF_KEY, r); } catch {} // kept so it can be saved with the first campaign later
    api.getCreator(r).then(c => setName(c.name.split(" ")[0])).catch(() => {});
  }, []);
  if (!ref) return null;
  return <div className="refbanner" role="status">{name ? `${name} invited you.` : "A local creator invited you."} Find creators for your business.</div>;
}
