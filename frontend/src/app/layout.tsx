import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExcelPilot",
  description: "AI-powered Excel analysis platform",
};

import { AuthProvider } from "@/lib/AuthContext";
import FeedbackWidget from "@/components/FeedbackWidget";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <AuthProvider>
          {children}
          <FeedbackWidget />
        </AuthProvider>
      </body>
    </html>
  );
}