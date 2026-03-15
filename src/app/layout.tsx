import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/components/NavBar";
import ViniChat from "@/components/ViniChat";
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
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <ViniChat />
      </body>
    </html>
  );
}
