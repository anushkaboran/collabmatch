import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/Header";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: "CollabMatch",
  description: "Find local creators who fit your budget. The right creators. The right audience. The right budget."
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>
        <ToastProvider>
          <Suspense fallback={<header className="bar"><div className="bar-in"><span className="brand">CollabMatch</span></div></header>}><Header /></Suspense>
          <main>{children}</main>
          <footer className="footer">Creator data in this prototype is synthetic. Photos are illustrative.</footer>
        </ToastProvider>
      </body>
    </html>
  );
}
