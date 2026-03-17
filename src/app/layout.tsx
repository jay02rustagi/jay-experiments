import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/components/NavBar";
import IdentityClientWrapper from "@/components/IdentityClientWrapper";
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
  title: "SpyneAutoAI - Premium Dealership Experience",
  description: "AI-powered SaaS prototype for modern car dealerships.",
};

import { useIdentity } from "@/hooks/useIdentity";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 flex flex-col min-h-screen`}
        suppressHydrationWarning={true}
      >
        <NavBar />
        <IdentityClientWrapper>
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </IdentityClientWrapper>
      </body>
    </html>
  );
}
