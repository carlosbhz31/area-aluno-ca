import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const fonte = Manrope({ subsets: ["latin"], variable: "--fonte", display: "swap" });

export const metadata: Metadata = {
  title: "Área do Aluno CA",
  description: "Consultoria Premium Carlos Alberto",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Aluno CA", statusBarStyle: "black-translucent" },
  icons: { icon: "/icones/icone-192.png", apple: "/icones/apple-touch-icon.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090909",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fonte.variable}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
