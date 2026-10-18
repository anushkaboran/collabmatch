"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Creator, CreatorMatch } from "@/lib/types";

export const kfmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "K" : String(n));
export const initials = (n: string) => n.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
export const platformName = (p: string) => (p === "tiktok" ? "TikTok" : p === "instagram" ? "Instagram" : p.charAt(0).toUpperCase() + p.slice(1));
const COLOR_INDEX: Record<string, number> = { violet: 0, pink: 1, orange: 2, green: 3, blue: 4 };
export const colorClass = (c: Pick<Creator, "avatarColor">) => `k${COLOR_INDEX[c.avatarColor] ?? 0}`;

const P = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const s = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true };
  switch (name) {
    case "pin": return <svg {...s} {...P}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
    case "people": return <svg {...s} {...P}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5" /></svg>;
    case "check": return <svg {...s} {...P} strokeWidth={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
    case "spark": return <svg {...s} fill="currentColor"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" /></svg>;
    case "heart": return <svg {...s} fill="currentColor"><path d="M12 21s-8-5.4-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.6-8 11-8 11z" /></svg>;
    case "chat": return <svg {...s} {...P}><path d="M4 5h16v11H9l-5 4z" /></svg>;
    case "play": return <svg {...s} fill="#fff"><path d="M7 4l13 8-13 8z" /></svg>;
    case "eye": return <svg {...s} {...P}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "lock": return <svg {...s} {...P}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
    case "cup": return <svg {...s} {...P}><path d="M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6zM17 10h1.5a2.5 2.5 0 0 1 0 5H17" /></svg>;
    case "leaf": return <svg {...s} {...P}><path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7" /></svg>;
    case "bag": return <svg {...s} {...P}><path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2" /></svg>;
    default: return null;
  }
}

export function Photo({ src, alt = "" }: { src: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="cover" src={src} alt={alt} loading="lazy" decoding="async" />;
}

export function Avatar({ creator, size = "" }: { creator: Pick<Creator, "name" | "avatarColor">; size?: "" | "sm" | "lg" }) {
  return <span className={`av ${colorClass(creator)} ${size}`} aria-hidden="true">{initials(creator.name)}</span>;
}

export function SourceBadge({ c }: { c: Creator }) {
  if (c.verified) return <span className="chip solo t-place"><Icon name="check" size={15} />Verified</span>;
  if (c.dataSource === "business") return <span className="chip solo t-niche">Added by you</span>;
  return <span className="chip solo" style={{ background: "var(--sunk)", color: "var(--muted)" }}>Self-reported</span>;
}

export function ScoreRing({ m }: { m: CreatorMatch }) {
  const c = !m.eligible ? "var(--muted)" : m.score >= 85 ? "var(--green)" : m.score >= 70 ? "var(--blue)" : "var(--orange)";
  return <div className="ring" style={{ ["--v" as string]: m.score, ["--c" as string]: c }} aria-label={`Fit ${m.score} out of 100`}><span>{m.score}</span></div>;
}

export function Spinner({ color }: { color?: string }) { return <span className="spin" style={color ? { color } : undefined} />; }

/* ---------- toasts ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((m: string) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(null), 3000); }, []);
  return <ToastCtx.Provider value={show}>{children}{msg && <div className="toast" role="status" key={msg}>{msg}</div>}</ToastCtx.Provider>;
}

/** Re-run `fn` every `ms` while mounted (used for live status updates). */
export function useInterval(fn: () => void, ms: number) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  useEffect(() => { const h = setInterval(() => ref.current(), ms); return () => clearInterval(h); }, [ms]);
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <section className="panel err"><h2>Something went wrong</h2><p className="muted">{message}</p>{onRetry && <button type="button" className="btn fill" onClick={onRetry}>Try again</button>}</section>;
}
