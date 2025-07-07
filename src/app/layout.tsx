import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Comfyrter - Natural Language to ComfyUI Workflow Generator",
  description: "Convert natural language descriptions into ComfyUI workflow JSON files. Generate complex image processing workflows with simple text descriptions.",
  keywords: ["ComfyUI", "workflow", "AI", "image generation", "stable diffusion", "natural language"],
  authors: [{ name: "montenegronyc" }],
  openGraph: {
    title: "Comfyrter - ComfyUI Workflow Generator",
    description: "Convert natural language descriptions into ComfyUI workflow JSON files",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
