import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anime - Vers | Your anime, your way",
  description: "Discover your next favourite anime and enjoy a better mobile viewing experience with Anime - Vers.",
  applicationName: "Anime - Vers",
  metadataBase: new URL("https://anime-vers.vercel.app"),
  openGraph: {
    title: "Anime - Vers | Your anime, your way",
    description: "Discover anime. Find your next favourite. Take your watchlist with you.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
