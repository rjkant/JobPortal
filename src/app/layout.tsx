import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "JobPilot — AI-Powered Job Application Automation",
  description: "Automatically apply to jobs on Naukri, Shine, Monster with AI resume tailoring. Runs every 6 hours.",
  keywords: "automated job applications, AI resume, Naukri automation, job search AI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-inter antialiased bg-gray-950 text-white`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
