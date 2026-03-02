import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ResponsiveWrapper } from "@/components/layout/ResponsiveWrapper";
import { BottomNav } from "@/components/layout/BottomNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TeleDigest",
  description: "Mobile-oriented web player for Telegram audio digests",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ResponsiveWrapper>
          <div className="flex min-h-screen flex-col">
            <main className="flex-1 overflow-auto pb-24">
              {children}
            </main>
            <BottomNav />
          </div>
        </ResponsiveWrapper>
      </body>
    </html>
  );
}
