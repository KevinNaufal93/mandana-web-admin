import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { QueryProvider } from "@/app/providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const gambetta = localFont({
  src: [
    { path: "./fonts/gambetta/Gambetta-Variable.woff2", style: "normal" },
    { path: "./fonts/gambetta/Gambetta-VariableItalic.woff2", style: "italic" },
  ],
  variable: "--font-gambetta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mandana Admin",
  description: "Panel admin untuk Mandana Property.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${inter.variable} ${gambetta.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-primary">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
