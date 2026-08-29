import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentReady Coach",
  description: "Evidence-backed product intelligence for agentic commerce",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a className="sr-only focus:not-sr-only" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
