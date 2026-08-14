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
  title: "Signal/in — post with signal, not hope",
  description:
    "Profile your real LinkedIn audience, write your post five ways for your goal, and wind-tunnel test every take with AI agents before you publish.",
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
