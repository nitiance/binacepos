import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";

import "./globals.css";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

const heading = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://binance-site-gules.vercel.app"),
  title: {
    default: "BinanceXI POS",
    template: "%s | BinanceXI POS",
  },
  description:
    "Offline-first POS for low-connectivity regions. Fast sales, receipts, inventory, and multi-tenant billing.",
  openGraph: {
    title: "BinanceXI POS",
    description:
      "Offline-first POS for low-connectivity regions. Fast sales, receipts, inventory, and multi-tenant billing.",
    url: "https://binance-site-gules.vercel.app",
    siteName: "BinanceXI POS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BinanceXI POS",
    description:
      "Offline-first POS for low-connectivity regions. Fast sales, receipts, inventory, and multi-tenant billing.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${heading.variable} ${body.variable}`}>
        <div
          aria-hidden
          className="grid-bg"
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.35,
          }}
        />

        <SiteNav />

        <main style={{ paddingBottom: 56 }}>{children}</main>

        <SiteFooter />

        <div className="container" style={{ paddingBottom: 24 }}>
          <div className="muted2" style={{ fontSize: 12, textAlign: "center" }}>
            Built by{" "}
            <Link href="https://binacepos.vercel.app" className="muted">
              BinanceXI POS
            </Link>
            .
          </div>
        </div>
      </body>
    </html>
  );
}

