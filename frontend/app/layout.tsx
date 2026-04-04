import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Study Companion",
    template: "%s | Study Companion",
  },
  description: "AI-powered study productivity platform. Plan, track, and ace your academics.",
  keywords: ["study", "AI", "productivity", "planner", "assignments"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${plusJakartaSans.variable} min-h-screen bg-background text-text-primary font-sans`}>
        <Sidebar />
        <Header />
        {/* Main content area offset by sidebar (240px) and header (64px) */}
        <main className="ml-60 pt-16 min-h-screen">
          <div className="p-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
