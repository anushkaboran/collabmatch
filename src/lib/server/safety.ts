// Safety checks for an AI app that handles money and creators' data.
// These are the fixes we expect a VEYZL audit to ask for; keep them when refactoring.

/**
 * 1. AI promises the business didn't approve.
 * A Gemini-written invitation may only mention the approved fee, and may not add perks or terms.
 */
const FORBIDDEN = /\b(bonus|commission|exclusive|exclusivity|free (meal|drinks?|food|products?|items?)|gift card|guarantee[ds]?|contract|equity|per month|monthly|retainer|unlimited)\b/i;
export function checkProposal(message: string, approved: { fee: number; deliverables: string[] }): { ok: boolean; reason?: string } {
  const amounts = [...message.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)/g)].map(m => Number(m[1].replace(/,/g, "")));
  if (!amounts.includes(approved.fee)) return { ok: false, reason: "approved fee missing" };
  if (amounts.some(a => a !== approved.fee)) return { ok: false, reason: "unapproved dollar amount" };
  if (FORBIDDEN.test(message)) return { ok: false, reason: "unapproved perk or term" };
  if (message.length > 900) return { ok: false, reason: "too long" };
  return { ok: true };
}

/**
 * 2. Prompt injection through captions, bios or a business's notes.
 * User-written text goes to Gemini inside clear markers with an instruction to treat it as data;
 * the outputs are then validated against fixed vocabularies, so injected text can't add new values.
 */
export function wrapUntrusted(text: string) {
  const safe = String(text ?? "").replace(/<\/?untrusted>/gi, "").slice(0, 8000);
  return `<untrusted>\n${safe}\n</untrusted>`;
}

/**
 * 3. Creators' tokens and personal data in logs.
 * Never log Instagram responses or tokens; use this when an error message might contain them.
 */
export function scrub(value: unknown): string {
  return String(value instanceof Error ? value.message : value)
    .replace(/access_token=[^&\s"]+/gi, "access_token=[redacted]")
    .replace(/(IG|EAA)[A-Za-z0-9_-]{20,}/g, "[redacted-token]")
    .replace(/client_secret=[^&\s"]+/gi, "client_secret=[redacted]");
}

/** 4. Input limits on everything a person can type into the API. */
export const clampText = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
export const positiveMoney = (v: unknown, max = 100000) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n) : null;
};
