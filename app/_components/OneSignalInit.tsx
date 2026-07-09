import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// IMPORTAMOS O AVISO DO APP E O PROVIDER DO ONESIGNAL
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
        <OneSignalProvider>
          {children}

          {/* COMPONENTE FLUTUANTE DE INSTALAÇÃO */}
          <InstalarAppAviso />
        </OneSignalProvider>
        {/* REGISTRO DO SERVICE WORKER (PWA) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}