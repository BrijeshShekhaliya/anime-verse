import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://stream-aggregator-lac.vercel.app";
const title = "Anime - Vers | Discover Your Next Favourite Anime";
const description =
  "Explore anime, discover your next favourite series, and enjoy a mobile-first viewing experience with Anime - Vers for Android.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | Anime - Vers",
  },
  description,
  applicationName: "Anime - Vers",
  keywords: [
    "Anime - Vers",
    "Anime Vers app",
    "anime Android app",
    "anime discovery",
    "anime watchlist",
    "anime episodes",
    "anime streaming app",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Anime - Vers",
    title,
    description,
    locale: "en_IN",
    images: [{ url: "/logo.svg", width: 512, height: 512, alt: "Anime - Vers logo" }],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0e",
  width: "device-width",
  initialScale: 1,
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: "Anime - Vers",
  applicationCategory: "EntertainmentApplication",
  operatingSystem: "Android",
  description,
  url: siteUrl,
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
