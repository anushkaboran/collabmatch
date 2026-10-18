import Link from "next/link";
import { Icon } from "@/components/ui";

const PLANS = [
  {
    name: "Creators", price: "Free", per: "always", tone: "pink",
    blurb: "Join with Instagram, get offers from local spots.",
    perks: ["Profile built from your posts", "Set your own rate", "Accept, pass or ask for more"],
    cta: { label: "Join as a creator", href: "/creator" },
  },
  {
    name: "Starter", price: "$0", per: "for businesses", tone: "green",
    blurb: "Try it on your first campaign.",
    perks: ["1 active campaign", "Recommended team", "AI-written invites"],
    cta: { label: "Find my creators", href: "/" },
  },
  {
    name: "Business Pro", price: "$29", per: "/month", tone: "violet", featured: true,
    blurb: "For spots that run campaigns often.",
    perks: ["Unlimited campaigns", "All team plans", "Add creators from social", "Tracking"],
    cta: { label: "Start with Pro", href: "/" },
  },
];

export default function PricingPage() {
  return (
    <div className="wrap">
      <section className="price-head">
        <h1>Simple pricing</h1>
        <p className="lead">Businesses pay to run campaigns. Creators never pay.</p>
      </section>
      <section className="plans" aria-label="Plans">
        {PLANS.map(p => (
          <article key={p.name} className={`panel plan ${p.featured ? "featured" : ""}`} style={{ ["--tone" as string]: `var(--${p.tone})`, ["--tone-soft" as string]: `var(--${p.tone}-soft)` }}>
            <span className="chip solo plan-name">{p.name}</span>
            <div className="plan-price"><b>{p.price}</b><span>{p.per}</span></div>
            <p className="muted">{p.blurb}</p>
            <ul className="plan-perks">
              {p.perks.map(x => <li key={x}><span className="ok"><Icon name="check" size={14} /></span>{x}</li>)}
            </ul>
            <Link href={p.cta.href} className={p.featured ? "cta" : "btn plan-btn"}>{p.cta.label}</Link>
          </article>
        ))}
      </section>
      <p className="tiny" style={{ textAlign: "center" }}>Early pricing we&apos;re testing with local businesses.</p>
    </div>
  );
}
