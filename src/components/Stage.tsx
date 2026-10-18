import { Photo } from "./ui";

/** Hero illustration: one phone showing a creator post plus two floating cards. Decorative, no people. */
export default function Stage({ kind }: { kind: "business" | "creator" }) {
  const creator = kind === "creator";
  return (
    <div className="stage" aria-hidden="true">
      <div className="phone">
        <div className="phone-top"><span className="mini">MC</span>@maya.eats.sea</div>
        <div className="shot"><Photo src={creator ? "/img/food2.jpg" : "/img/cafe3.jpg"} /></div>
        <div className="phone-bot">
          <b>1,284 likes</b><span className="muted">{creator ? "pasta night on the hill" : "cappuccino o'clock"}</span>
        </div>
      </div>
      {creator ? (
        <>
          <div className="float f1"><span className="av sm k2">KL</span><div>New offer<small>Kettle &amp; Leaf Café</small></div></div>
          <div className="float f2"><div><span className="bigscore" style={{ color: "var(--violet)" }}>$120</span><small>for 1 video + 2 stories</small></div></div>
        </>
      ) : (
        <>
          <div className="float f1"><span className="bigscore">98</span><div>fit score<small>Maya · Capitol Hill</small></div></div>
          <div className="float f2"><div>$300 team<div className="minibar"><i className="k0" style={{ width: "40%" }} /><i className="k1" style={{ width: "33%" }} /><i className="k2" style={{ width: "27%" }} /></div></div></div>
        </>
      )}
    </div>
  );
}
