import type { Metadata } from "next";
import { Space_Grotesk, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Three faces: a characterful display for the food name, a clean grotesque for
// body + the label (Helvetica-adjacent, so the FDA label reads authentic), and
// a mono for the numbers.
const display = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nutrition Facts — food photo scanner",
  description:
    "Upload a food photo, get an FDA-style Nutrition Facts label, and talk through it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
