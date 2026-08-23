import type { Metadata } from "next";
import { SITE_URL } from "@/shared/config/environment";
import "./globals.css";

const siteUrl = new URL(`${SITE_URL.replace(/\/$/, "")}/`);
const socialImage = new URL("og.png", siteUrl).toString();

export const dynamic = "force-static";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "Timeline Map Visualizer â€” Your journeys, mapped privately",
  description:
    "Explore Google Maps Timeline exports locally in your browser. No uploads, no account, and no tracking.",
  openGraph: {
    title: "Timeline Map Visualizer",
    description: "Your journeys, beautifully mappedâ€”locally and privately in your browser.",
    type: "website",
    images: [{ url: socialImage, width: 1692, height: 945, alt: "Timeline Map Visualizer social preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Timeline Map Visualizer",
    description: "Your journeys, beautifully mappedâ€”locally and privately in your browser.",
    images: [socialImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
