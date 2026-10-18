import { Suspense } from "react";
import InviteView from "./view";

type Params = Promise<{ token: string }>;

async function Resolved({ params }: { params: Params }) {
  const { token } = await params;
  return <InviteView token={token} />;
}

// The route param is only known at request time, so it streams in behind a placeholder.
export default function Page({ params }: { params: Params }) {
  return <Suspense fallback={<div className="wrap"><div className="skeleton" style={{ height: 420 }} /></div>}><Resolved params={params} /></Suspense>;
}
