import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "FlowForge AI | n8n & Monday.com Automation Hub",
  description:
    "Autonomous n8n workflow builder, Monday.com workspace simulator, AI structured data extraction playground, and BI analytics dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased font-sans flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
