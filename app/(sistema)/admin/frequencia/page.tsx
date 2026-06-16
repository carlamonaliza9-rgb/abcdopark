"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { CalendarDays, Filter, ChevronLeft, Printer } from "lucide-react";

export default function RelatorioFrequenciaAdminPage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().substring(0, 7)); // Formato YYYY-MM
  const [frequenciaMensal, setFrequenciaMensal] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);

  // --- TRAVA DE SEGURANÇA ---
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

      if (!ehAdmin) return router.push("/dashboard");
      
      setVerificandoAcesso(false);
      buscarTurmas();
    }
    verificarAcesso();
  }, [router]);

  async function buscarTurmas() {
    const { data } = await supabase.from('turmas_info').select('nome_turma').order('nome_turma', { ascending: true });
    if (data) {
      setTurmas(data);
      if (data.length > 0) setTurmaSelecionada(data[0].nome_turma);
    }
  }

  useEffect(() => {
    if (turmaSelecionada && !verificandoAcesso) {
      buscarDadosFrequencia();
    }
  }, [turmaSelecionada, mesFiltro, verificandoAcesso]);

  async function buscarDadosFrequencia() {
    setCarregando(true);
    const { data: listaAlunos } = await supabase
      .from('alunos')
      .select('id, nome')
      .eq('turma', turmaSelecionada)
      .neq('status', 'transferido') // <--- FILTRO ADICIONADO: Ignora transferidos
      .order('nome', { ascending: true });

    if (listaAlunos) setAlunos(listaAlunos);

    const { data: faltas } = await supabase
      .from('frequencias')
      .select('*')
      .gte('data', `${mesFiltro}-01`)
      .lte('data', `${mesFiltro}-31`);

    if (faltas) setFrequenciaMensal(faltas);
    setCarregando(false);
  }

  const [ano, mes] = mesFiltro.split('-').map(Number);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const nomeMes = new Date(ano, mes - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  if (verificandoAcesso) return <div className="p-10 text-center font-black uppercase text-slate-400 tracking-widest text-xs animate-pulse">Verificando...</div>;

  return (
    <div className="w-full min-h-screen bg-white md:bg-[#f4f7f9] p-4 md:p-8 lg:p-10 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="mb-6 md:mb-10 max-w-[1600px] mx-auto">
        <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
          <span className="bg-blue-600 text-white p-3 rounded-2xl"><CalendarDays size={24} /></span>
          Frequência Geral
        </h1>
        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Relatório de presença administrativo</p>
        
        <div className="mt-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 md:max-w-xs">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Turma</label>
            <select 
              value={turmaSelecionada} 
              onChange={(e) => setTurmaSelecionada(e.target.value)}
              className="w-full p-4 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm bg-white"
            >
              {turmas.map(t => <option key={t.nome_turma} value={t.nome_turma}>{t.nome_turma}</option>)}
            </select>
          </div>

          <div className="flex-1 md:max-w-xs">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Mês de Referência</label>
            <input 
              type="month" 
              value={mesFiltro} 
              onChange={(e) => setMesFiltro(e.target.value)} 
              className="w-full p-4 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm bg-white"
            />
          </div>
        </div>
      </header>

      {/* PAINEL DE DADOS */}
      <div className="bg-white md:rounded-[2.5rem] p-4 md:p-8 shadow-sm border border-slate-100 max-w-[1600px] mx-auto">
        <div className="flex justify-between items-center mb-6 px-1">
            <h3 className="text-lg font-black text-slate-800 capitalize italic">{nomeMes}</h3>
            <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest">
                <span className="text-green-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Presença</span>
                <span className="text-red-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Falta</span>
            </div>
        </div>

        {/* TABELA RESPONSIVA */}
        <div className="w-full overflow-x-auto custom-scrollbar pb-4">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Aluno</th>
                {[...Array(diasNoMes)].map((_, i) => (
                  <th key={i} className="p-2 text-[10px] font-black text-slate-400 text-center min-w-[30px]">{i + 1}</th>
                ))}
                <th className="p-4 text-[10px] font-black text-blue-600 uppercase tracking-widest text-center">Faltas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {carregando ? (
                <tr><td colSpan={diasNoMes + 2} className="text-center p-8 font-black text-slate-300">Carregando...</td></tr>
              ) : alunos.map(aluno => {
                let totalFaltas = 0;
                return (
                  <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-700 text-xs sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {aluno.nome.split(' ')[0]} {aluno.nome.split(' ').slice(-1)}
                    </td>
                    {[...Array(diasNoMes)].map((_, i) => {
                      const dia = (i + 1).toString().padStart(2, '0');
                      const reg = frequenciaMensal.find(f => f.aluno_id === aluno.id && f.data === `${mesFiltro}-${dia}`);
                      if (reg && reg.presente === false) totalFaltas++;
                      return (
                        <td key={i} className={`p-2 text-center text-[10px] font-black ${reg ? (reg.presente ? 'text-green-500' : 'text-red-500') : 'text-slate-200'}`}>
                          {reg ? (reg.presente ? 'P' : 'F') : '-'}
                        </td>
                      );
                    })}
                    <td className={`p-4 text-center font-black ${totalFaltas > 3 ? 'text-red-500' : 'text-slate-600'}`}>
                      {totalFaltas}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* AÇÕES */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => window.print()} 
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Printer size={16} /> Imprimir Relatório
          </button>
          <button 
            onClick={() => router.push('/admin/alunos')} 
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
          >
            <ChevronLeft size={16} /> Voltar para Alunos
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @media print {
          @page { size: landscape; margin: 1cm; }
          body * { visibility: hidden; }
          table, table * { visibility: visible; }
          table { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}} />
    </div>
  );
}