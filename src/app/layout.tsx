import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "TechRadar France : les événements tech qui comptent",
    template: "%s | TechRadar France",
  },
  description:
    "Meetups, conférences, hackathons et salons tech en France, réunis depuis plusieurs sources et filtrables par ville, thème et prix.",
  openGraph: { type: "website", locale: "fr_FR", siteName: "TechRadar France" },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex min-h-dvh flex-col font-sans">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-button focus:bg-white focus:px-4 focus:py-2"
        >
          Aller au contenu
        </a>
        <SiteHeader />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
