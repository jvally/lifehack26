import type { Metadata } from "next";
import Link from "next/link";
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
        <header className="site-header">
          <div className="site-header-inner">
            <Link className="brand-mark" href="/">
              AgentReady Coach
            </Link>
            <span className="brand-meta">
              Evidence-first commerce intelligence
            </span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
