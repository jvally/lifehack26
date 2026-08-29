import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentReady Coach",
  description: "Product intelligence for agentic commerce",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
