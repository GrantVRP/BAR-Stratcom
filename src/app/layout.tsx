import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel-heading",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel-body",
});

export const metadata: Metadata = {
  title: "Beyond All Reason // StratCom 16-Bit Tactical Console",
  description: "16-bit retro tactical arcade build order generator and telemetry console for Beyond All Reason",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${vt323.variable} dark h-full`}
    >
      <body className="min-h-full flex flex-col font-pixel-body bg-[#0c0c14] text-zinc-100">
        {children}
      </body>
    </html>
  );
}
