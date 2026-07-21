import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { InstalarAppAviso } from "@/app/_components/InstalarAppAviso";
import OneSignalProvider from "@/app/_components/OneSignalProvider"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ABC DO PARK",
  description: "Sistema de Gestão Escolar",
  manifest: "/manifest.json", 
  icons: {
    icon: "/icon.jpg", 
    apple: "/icon.jpg", 
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR" 
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#e0ffff]">
        {/* O PROVIDER INICIALIZA O ONESIGNAL AUTOMATICAMENTE */}
        <OneSignalProvider>
          {children}
        </OneSignalProvider>

        <InstalarAppAviso />
        
        {/* REMOVEMOS O BLOCO <script> AQUI. Ele era a causa dos erros 404 e conflitos. */}
      </body>
    </html>
  );
}