import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Signal/in — launch accelerator for LinkedIn",
  description:
    "Map your real LinkedIn audience, generate per-niche launch posts, and wind-tunnel test them with AI agents before you hit post.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${bricolage.variable} ${geistSans.variable} ${geistMono.variable} grain font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
