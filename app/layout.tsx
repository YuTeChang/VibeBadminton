import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/contexts/SessionContext";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "PoweredByPace - Track Your Games & Settle Up",
  description: "Metrics and tracking for your badminton games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

