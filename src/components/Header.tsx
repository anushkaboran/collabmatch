"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, session, USE_MOCKS } from "@/lib/api";
import { useToast } from "./ui";

export default function Header() {
  const path = usePathname();
  const router = useRouter();
  const toast = useToast();
  const isCreator = path.startsWith("/creator") || path.startsWith("/invite");
  const reset = async () => {
    await api.reset();
    session.setCreatorId(null);
    toast("Demo reset");
    router.push("/");
    router.refresh();
  };
  return (
    <header className="bar">
      <div className="bar-in">
        <Link href="/" className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>CollabMatch</Link>
        <nav className="roles" aria-label="Switch view">
          <Link href="/" aria-current={!isCreator ? "page" : undefined}>I&apos;m a business</Link>
          <Link href="/creator" className="creator" aria-current={isCreator ? "page" : undefined}>I&apos;m a creator</Link>
        </nav>
        {!isCreator && <Link href="/business" className="navlink">My campaigns</Link>}
        <span className="spacer" />
        {USE_MOCKS && <span className="mockbadge" title="Running on sample data in your browser">Demo data</span>}
        <button type="button" className="reset" onClick={reset}>Start over</button>
      </div>
    </header>
  );
}
