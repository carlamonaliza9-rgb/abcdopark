"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";

export default function OneSignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Inicializa o OneSignal apenas no lado do cliente
    OneSignal.init({
      appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
      allowLocalhostAsSecureOrigin: true, // Importante para testes locais
    });
  }, []);

  return <>{children}</>;
}