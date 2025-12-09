import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/contexts/SessionContext";

export const metadata: Metadata = {
  title: "VibeBadminton - Track Your Games & Settle Up",
  description: "Track badminton doubles games and automatically calculate who owes what",
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
      </body>
    </html>
  );
}

