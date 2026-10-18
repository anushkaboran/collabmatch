import { Suspense } from "react";
import CampaignView from "./view";

type Params = Promise<{ id: string }>;

async function Resolved({ params }: { params: Params }) {
  const { id } = await params;
  return <CampaignView id={id} />;
}

// The route param is only known at request time, so it streams in behind a placeholder.
export default function Page({ params }: { params: Params }) {
  return <Suspense fallback={<div className="wrap"><div className="skeleton" style={{ height: 420 }} /></div>}><Resolved params={params} /></Suspense>;
}
