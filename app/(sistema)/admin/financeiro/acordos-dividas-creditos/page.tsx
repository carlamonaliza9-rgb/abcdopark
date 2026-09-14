"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// --- IMPORTAÇÕES DOS NOVOS SUBCOMPONENTES MODULARIZADOS ---
import { VisaoMensalidades } from "./_components/VisaoMensalidades";
import { VisaoSaldosCreditos } from "./_components/VisaoSaldosCreditos";
import { VisaoAcordos } from "./_components/VisaoAcordos";

export default function ControleFinanceiroUnificadoPage() {
  const router = useRouter();
  const [visaoAtiva, setVisaoAtiva] = useState<"mensalidades" | "saldos" | "acordos">("mensalidades");
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Controle de barramento reativo entre as abas
  const [chaveReload, setChaveReload] = useState(0);

  useEffect(() => {
    const handleRecarregamento = () => setChaveReload(prev => prev + 1);
    window.addEventListener('recarregarBalançoGlobal', handleRecarregamento);
    return () => window.removeEventListener('recarregarBalançoGlobal', handleRecarregamento);
  }, []);

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const emailAtual = user.email || "";
      setUserEmail(emailAtual);
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();

      const ehAutorizado = emailAtual === 'carlamonaliza9@gmail.com' || emailAtual === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin' || perfil?.cargo === 'Direção';
      if (!ehAutorizado) return router.push("/dashboard");

      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  if (verificandoAcesso) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse">Verificando Credenciais...</div>;

  return (
    <div key={chaveReload} className="w-full bg-slate-50 min-h-screen font-sans antialiased text-slate-800 pb-24 md:p-6 lg:p-8 flex flex-col overflow-x-hidden">
      
      {/* SELETOR FLUIDO DE ABAS MESTRE */}
      <div className="max-w-[1700px] w-full mx-auto mb-6 px-4 pt-4 md:pt-0">
        <div className="flex overflow-x-auto custom-scrollbar bg-slate-200/60 p-1.5 rounded-2xl w-full md:w-fit border border-slate-300/40 gap-1.5 md:gap-2 whitespace-nowrap pb-1 md:pb-1.5">
          <button
            onClick={() => setVisaoAtiva("mensalidades")}
            className={`px-5 py-3 md:px-6 md:py-2.5 rounded-xl text-sm font-bold transition-all flex-1 md:flex-none ${visaoAtiva === "mensalidades" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            📅 Mensalidades
          </button>
          <button
            onClick={() => setVisaoAtiva("saldos")}
            className={`px-5 py-3 md:px-6 md:py-2.5 rounded-xl text-sm font-bold transition-all flex-1 md:flex-none ${visaoAtiva === "saldos" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            👥 Saldos e Créditos
          </button>
          <button
            onClick={() => setVisaoAtiva("acordos")}
            className={`px-5 py-3 md:px-6 md:py-2.5 rounded-xl text-sm font-bold transition-all flex-1 md:flex-none ${visaoAtiva === "acordos" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            🤝 Acordos
          </button>
        </div>
      </div>

      {/* RENDERIZAÇÃO DINÂMICA COMPONENTIZADA */}
      <div className="max-w-[1700px] w-full mx-auto px-4 flex-1">
        {visaoAtiva === "mensalidades" ? (
          <VisaoMensalidades userEmail={userEmail} />
        ) : visaoAtiva === "saldos" ? (
          <VisaoSaldosCreditos />
        ) : (
          <VisaoAcordos userEmail={userEmail} />
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}