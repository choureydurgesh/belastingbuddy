import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { FeedbackButton } from "@/components/FeedbackButton";

export const metadata: Metadata = {
  metadataBase: new URL("https://belastingbuddy.com"),
  title: "BelastingBuddy – Dutch taxes in plain English",
  description: "A simple guide for expats and residents to the Dutch income tax return.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LangProvider>
          {children}
          <FeedbackButton />
        </LangProvider>
      </body>
    </html>
  );
}
