"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ShieldCheck, Search, X, FileText, Calendar, User, Tag } from "lucide-react";

export default function LogsAdminPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [logSelecionado, setLogSelecionado] = useState<any>(null);

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const emailAtual = user.email || "";
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();

      const ehAdmin = 
        emailAtual === 'carlamonaliza9@gmail.com' || 
        emailAtual === 'diretoria@abcdopark.com' || 
        perfil?.cargo === 'Admin';

      if (!ehAdmin) {
        return router.push("/dashboard");
      }

      await buscarLogs();
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  async function buscarLogs() {
    setCarregando(true);
    const { data, error } = await supabase
      .from('logs_sistema')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      console.error("Erro ao buscar logs:", error.message);
    } else if (data) {
      setLogs(data);
    }
    setCarregando(false);
  }

  const logsFiltrados = logs.filter(log => 
    log.usuario_email.toLowerCase().includes(busca.toLowerCase()) ||
    log.detalhes.toLowerCase().includes(busca.toLowerCase()) ||
    log.acao.toLowerCase().includes(busca.toLowerCase())
  );

  const obterEstiloAcao = (acao: string) => {
    switch (acao) {
      case "INSERÇÃO":
        return "bg-green-100 text-green-700";
      case "EDIÇÃO":
        return "bg-amber-100 text-amber-800";
      case "EXCLUSÃO":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  if (verificandoAcesso) return <div className="p-10 text-center text-slate-400 font-black uppercase tracking-widest text-xs animate-pulse">Validando credenciais de auditoria...</div>;

  return (
    <div className="w-full min-h-screen bg-[#f4f7f9] p-4 md:p-8 lg:p-10 animate-in fade-in duration-500">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-8 max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter m-0 flex items-center gap-3">
            <span className="bg-slate-800 text-white p-3 rounded-2xl"><ShieldCheck size={24} /></span>
            Logs do Sistema
          </h1>
          <p className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Auditoria e histórico de alterações</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar logs..." 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)} 
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-none shadow-sm text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 bg-white" 
          />
        </div>
      </div>

      {/* Tabela de Histórico */}
      <div className="bg-white rounded-[2.5rem] p-4 md:p-8 shadow-sm border border-slate-100 max-w-[1600px] mx-auto overflow-hidden">
        {carregando ? (
          <p className="text-center text-slate-400 p-10 font-bold text-xs uppercase tracking-widest">Carregando histórico...</p>
        ) : logsFiltrados.length === 0 ? (
          <p className="text-center text-slate-400 p-10 font-bold text-xs uppercase tracking-widest">Nenhum registro encontrado.</p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[10px] font-black">
                  <th className="p-4">Data / Hora</th>
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Ação</th>
                  <th className="p-4">Tabela</th>
                  <th className="p-4">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logsFiltrados.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => { setLogSelecionado(log); setModalAberto(true); }}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer text-sm"
                  >
                    <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                      {new Date(log.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Belem' })}
                    </td>
                    <td className="p-4 font-bold text-slate-800">{log.usuario_email}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${obterEstiloAcao(log.acao)}`}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-600 uppercase text-[11px] tracking-wider">
                      📂 {log.tabela}
                    </td>
                    <td className="p-4 text-slate-600 line-clamp-1 max-w-[300px]">{log.detalhes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETALHES */}
      {modalAberto && logSelecionado && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setModalAberto(false)}
        >
          <div 
            className="bg-white p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-6">
              <h2 className="text-xl font-black text-slate-800">Detalhes da Auditoria</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider ${obterEstiloAcao(logSelecionado.acao)}`}>
                  {logSelecionado.acao}
                </span>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  📂 {logSelecionado.tabela}
                </span>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <User size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</span>
                </div>
                <p className="font-bold text-slate-800">{logSelecionado.usuario_email}</p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</span>
                </div>
                <p className="font-bold text-slate-800">
                  {new Date(logSelecionado.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Belem' })}
                </p>
              </div>

              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3 mb-3">
                  <FileText size={16} className="text-blue-500" />
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Detalhes da Ação</span>
                </div>
                <p className="text-sm text-blue-900 font-medium whitespace-pre-wrap leading-relaxed">
                  {logSelecionado.detalhes}
                </p>
              </div>
            </div>

            <button 
              onClick={() => setModalAberto(false)} 
              className="w-full mt-8 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
      
      {/* Ajuste de scrollbar global para tabelas */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
}