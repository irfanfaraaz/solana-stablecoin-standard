import type { Metadata } from "next";
import { Geist_Mono, DM_Sans, Syne } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/providers";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SSS Example Frontend",
  description: "Solana Stablecoin Standard — example UI using @stbr/sss-token SDK",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Providers>
        <body
          suppressHydrationWarning
          className={`${geistMono.variable} ${dmSans.variable} ${syne.variable} antialiased`}
        >
          {children}
        </body>
      </Providers>
    </html>
  );
}
