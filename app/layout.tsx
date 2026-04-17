import type { Metadata } from "next";
import { Sora, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { CustomCursor } from "@/components/ui/custom-cursor";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bizdhan — Personal & SME Finance in One App",
  description:
    "Track personal spending, manage investments, run SME billing, and gain financial insights — all under one unified platform. Choose your workspace at signup.",
  icons: {
    icon: "/images/logo.svg",
  },
};

const displayFont = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const sansFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased ${sansFont.variable} ${displayFont.variable} ${mono.variable} font-sans selection:bg-primary/30 selection:text-primary-foreground`}>
        <LenisProvider>
          <Providers>
            <CustomCursor />
            {children}
            <Toaster />
          </Providers>
        </LenisProvider>
      </body>
    </html>
  );
}