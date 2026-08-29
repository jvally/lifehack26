import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "RetailReady",
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
            <div className="flex items-center gap-4">
              <Link className="brand-mark" href="/">
                RetailReady
              </Link>
              <span className="brand-meta">
                Evidence-first commerce intelligence
              </span>
            </div>
            <nav aria-label="Main navigation" className="flex items-center gap-6">
              <Link
                className="text-sm font-semibold text-[var(--ink)] hover:text-[var(--primary-strong)]"
                href="/catalog"
              >
                Catalogue
              </Link>
              <Link
                className="text-sm font-semibold text-[var(--ink)] hover:text-[var(--primary-strong)]"
                href="/products/new"
              >
                RetailReady
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
