"use client";
import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";

export function InstalarAppAviso() {
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [eventoInstalacao, setEventoInstalacao] = useState<any>(null);

  useEffect(() => {
    // AJUSTE: Usamos sessionStorage para que o aviso seja dispensado apenas durante esta sessão/login
    const jaDispensou = sessionStorage.getItem("avisoInstalacaoDispensado");
    
    // Verifica se o App já está a ser acedido através do ícone instalado (modo standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Se já instalou ou já fechou o aviso nesta sessão, paramos por aqui
    if (jaDispensou || isStandalone) return;

    // Deteta se é dispositivo Apple
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      setMostrarAviso(true);
    }

    // Captura o evento automático de instalação do Android (Chrome)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setEventoInstalacao(e);
      setMostrarAviso(true);
    });
  }, []);

  const handleInstalar = async () => {
    if (eventoInstalacao) {
      eventoInstalacao.prompt();
      const { outcome } = await eventoInstalacao.userChoice;
      if (outcome === 'accepted') {
        setMostrarAviso(false);
        // Regista que já aceitou para não voltar a piscar durante a sessão
        sessionStorage.setItem("avisoInstalacaoDispensado", "true");
      }
    }
  };

  const fecharAviso = () => {
    setMostrarAviso(false);
    // AJUSTE: Grava no sessionStorage que o utilizador recusou o aviso hoje
    sessionStorage.setItem("avisoInstalacaoDispensado", "true");
  };

  if (!mostrarAviso) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-indigo-600 text-white p-4 rounded-2xl shadow-2xl z-[9999] animate-in slide-in-from-bottom-5 border border-indigo-500">
      <button onClick={fecharAviso} className="absolute top-2 right-2 text-indigo-200 hover:text-white p-1 transition-colors">
        <X size={18} />
      </button>
      
      <div className="flex items-center gap-4 pr-4">
        <div className="bg-white/20 p-3 rounded-xl shrink-0">
          <Download size={24} />
        </div>
        <div>
          <h4 className="font-black text-sm uppercase tracking-wide">Instale o nosso App</h4>
          {isIOS ? (
            <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
              Para instalar no iPhone, toque em Partilhar <Share size={12} className="inline mb-1 mx-0.5" /> e depois em <strong>"Ecrã Principal"</strong>.
            </p>
          ) : (
            <p className="text-xs text-indigo-100 mt-1 mb-3 leading-relaxed">
              Tenha acesso rápido ao portal escolar diretamente do seu celular.
            </p>
          )}
          
          {!isIOS && eventoInstalacao && (
            <button 
              onClick={handleInstalar}
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm active:scale-95 transition-transform"
            >
              Instalar Agora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}