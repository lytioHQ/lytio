import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lytio",
  description: "Lytio — AI-powered Excel analysis platform",
};

import { AuthProvider } from "@/lib/AuthContext";
import FeedbackWidget from "@/components/FeedbackWidget";
import HtmlLangSync from "@/components/HtmlLangSync";
import { isUILanguage, UI_LANG_DETECT_COOKIE } from "@/lib/i18n";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const detected = cookieStore.get(UI_LANG_DETECT_COOKIE)?.value;
  const htmlLang = isUILanguage(detected) ? detected : "zh";

  return (
    <html lang={htmlLang}>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <AuthProvider>
          {children}
          <FeedbackWidget />
          <HtmlLangSync />
        </AuthProvider>
      </body>
    </html>
  );
}