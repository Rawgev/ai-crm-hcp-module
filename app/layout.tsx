import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Pharmaxora — AI-Powered Life Sciences & HCP CRM",
  description:
    "Pharmaxora is an enterprise-grade AI-first Healthcare Professional (HCP) CRM platform featuring intelligent note synthesis, FDA 21 CFR Part 11 compliant audit trails, and automated pharmacovigilance.",
  keywords: [
    "Pharmaxora",
    "AI CRM",
    "HCP CRM",
    "Life Sciences CRM",
    "Pharmaceutical CRM",
    "Pharmacovigilance",
    "FDA 21 CFR Part 11",
    "Healthcare Professional Logging",
  ],
  authors: [{ name: "Pharmaxora Team" }],
  openGraph: {
    title: "Pharmaxora — AI-Powered Life Sciences & HCP CRM",
    description:
      "Enterprise AI-first CRM for Healthcare Professional engagement, regulatory compliance, and medical dialogue analysis.",
    siteName: "Pharmaxora",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pharmaxora — AI-Powered Life Sciences & HCP CRM",
    description:
      "Enterprise AI-first CRM for Healthcare Professional engagement and regulatory compliance.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
