import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import "./globals.css";

const manrope = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../../node_modules/@fontsource/manrope/files/manrope-latin-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../../node_modules/@fontsource/manrope/files/manrope-latin-600-normal.woff2",
      weight: "600",
    },
  ],
  variable: "--font-body",
  display: "swap",
});
const mono = localFont({
  src: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2",
  variable: "--font-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clean Workspace — Your account, in order",
  description:
    "A focused workspace for your profile, sessions, and permissions.",
  icons: { icon: "/mark.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${manrope.variable} ${mono.variable}`}>
      <body className={manrope.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
