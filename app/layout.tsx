import type { Metadata, Viewport } from "next";
import { body, display, mono } from "./fonts";
import { RevealObserver } from "@/components/RevealObserver";
import "./globals.css";
import "./styles/landing.css";
import "./styles/compare.css";
import "./styles/detail.css";
import "./styles/pages.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://redline.vercel.app"),
  title: {
    default: "Redline: what will this used car really cost you?",
    template: "%s · Redline",
  },
  description:
    "See the true 5-year cost of a used car in Washington State: value you lose, gas, insurance, maintenance, repairs and taxes, plus a reliability score.",
  openGraph: {
    title: "Redline: the true cost of a used car",
    description: "Compare up to 3 used cars by what they'll actually cost you over 5 years in Washington.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Marks JS as available before paint so scroll reveals never hide content for no-JS visitors. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        <RevealObserver />
      </body>
    </html>
  );
}
