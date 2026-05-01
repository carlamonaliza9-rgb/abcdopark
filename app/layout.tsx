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

// Alterações realizadas nos metadados e ícones
export const metadata: Metadata = {
  title: "ABC DO PARK",
  description: "Sistema de Gestão Escolar",
  icons: {
    icon: "/icon.jpg", // Caminho para o seu arquivo .jpg na pasta public
    apple: "/icon.jpg", // Garante a exibição correta em dispositivos iOS
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR" // Atualizado para português do Brasil
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}