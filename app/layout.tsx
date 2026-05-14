import type { Metadata, Viewport } from "next";
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

// Alterações realizadas nos metadados, ícones e PWA
export const metadata: Metadata = {
  title: "ABC DO PARK",
  description: "Sistema de Gestão Escolar",
  manifest: "/manifest.json", // ADICIONADO: Liga o arquivo de App
  icons: {
    icon: "/icon.jpg", // Caminho para o seu arquivo .jpg na pasta public
    apple: "/icon.jpg", // Garante a exibição correta em dispositivos iOS
  },
};

// ADICIONADO: Define a cor da barra do navegador no celular
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
      lang="pt-BR" // Atualizado para português do Brasil
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        
        {/* ADICIONADO: Motor do App (Service Worker) para permitir instalação no celular */}
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