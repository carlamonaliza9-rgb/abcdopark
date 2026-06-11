"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; 

export default function ConsultaFrequenciaPage() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().substring(0, 7)); // Formato YYYY-MM
  const [frequenciaMensal, setFrequenciaMensal] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function identificarProfessor() {
      setCarregando(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Correção: Agora busca o e-mail do professor em qualquer uma das 4 colunas de vinculação
          const { data: turmaData } = await supabase
            .from('turmas_info') 
            .select('nome_turma')
            .or(`email_prof_fixo_1.eq.${user.email},email_prof_fixo_2.eq.${user.email},email_prof_especifico_1.eq.${user.email},email_prof_especifico_2.eq.${user.email}`)
            .maybeSingle();

          if (turmaData) {
            setTurmaSelecionada(turmaData.nome_turma);
          }
        }
      } catch (err) {
        console.error("Erro na identificação:", err);
      } finally {
        // Correção Crítica: Garante que o loading vai parar mesmo se o professor não tiver turma
        setCarregando(false);
      }
    }
    identificarProfessor();
  }, []);

  useEffect(() => {
    if (turmaSelecionada) {
      buscarAlunosEFrequencia();
    }
  }, [turmaSelecionada, mesFiltro]);

  async function registrarLog(acao: string, detalhes: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('logs_sistema').insert([{
          usuario_email: user.email,
          acao: acao,
          tabela: 'frequencias',
          detalhes: detalhes
        }]);
      }
    } catch (e) {
      console.error("Erro ao gerar log de auditoria:", e);
    }
  }

  async function buscarAlunosEFrequencia() {
    setCarregando(true);
    try {
      const { data: listaAlunos } = await supabase
        .from('alunos')
        .select('id, nome, foto_url')
        .eq('turma', turmaSelecionada)
        .order('nome', { ascending: true });

      if (listaAlunos) setAlunos(listaAlunos);

      const { data: faltas } = await supabase
        .from('frequencias')
        .select('*')
        .gte('data', `${mesFiltro}-01`)
        .lte('data', `${mesFiltro}-31`);

      if (faltas) setFrequenciaMensal(faltas);

      if (listaAlunos && turmaSelecionada) {
        const [ano, mes] = mesFiltro.split('-');
        const nomeMesFormatado = new Date(parseInt(ano), parseInt(mes) - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        
        await registrarLog(
          "CONSULTA", 
          `🔍 Consultou o relatório de histórico de frequência mensal da turma ${turmaSelecionada}.\n` +
          `• Período visualizado: ${nomeMesFormatado} (${mesFiltro})\n` +
          `• Total de alunos listados na pauta: ${listaAlunos.length}`
        );
      }
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
    } finally {
      setCarregando(false);
    }
  }

  // Cálculos de data seguros à prova de NaN
  const [anoFiltro, mesNum] = mesFiltro.split('-').map(Number);
  const diasNoMes = new Date(anoFiltro, mesNum, 0).getDate();
  const nomeMes = new Date(anoFiltro, mesNum - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  if (carregando && alunos.length === 0) {
    return <div className="min-h-screen bg-white md:bg-slate-50 p-10 flex items-center justify-center text-slate-400 font-black uppercase tracking-widest animate-pulse text-xs">Buscando pauta...</div>;
  }

  return (
    <div className="w-full min-h-screen bg-white md:bg-slate-50 md:p-8 font-sans pb-24 animate-in fade-in duration-500 overflow-x-hidden">
      
      <div className="w-full max-w-[1600px] mx-auto">
        
        {/* ============================================== */}
        {/* HEADER & FILTROS (Mobile Native / Desktop Card) */}
        {/* ============================================== */}
        <header className="bg-white md:rounded-[2rem] px-4 pt-6 pb-4 md:p-6 md:shadow-sm border-b md:border border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-blue-900 uppercase tracking-tighter italic">Frequência 📋</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Turma Vinculada: {turmaSelecionada || "Nenhuma"}</p>
          </div>
          
          <div className="flex flex-col gap-1.5 md:gap-2 bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-2xl md:rounded-none">
            <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 md:px-0">Selecionar Mês</label>
            <input 
              type="month" 
              value={mesFiltro} 
              onChange={(e) => setMesFiltro(e.target.value)} 
              className="p-3 md:p-3 rounded-xl border border-slate-200 text-sm font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-100 md:focus:border-blue-400 transition-colors bg-white md:bg-slate-50 shadow-sm md:shadow-none"
            />
          </div>
        </header>

        {/* ============================================== */}
        {/* TABELA DE DADOS */}
        {/* ============================================== */}
        {turmaSelecionada && alunos.length > 0 ? (
          <div className="bg-white md:p-8 md:rounded-[2.5rem] md:shadow-sm md:border border-slate-100">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 mb-4 md:mb-8 px-4 md:px-0">
              <h3 className="text-lg md:text-xl font-black text-blue-900 capitalize italic">{nomeMes} {anoFiltro}</h3>
              <div className="flex gap-3 md:gap-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-slate-50 md:bg-transparent p-2 md:p-0 rounded-lg md:rounded-none w-full sm:w-auto justify-center sm:justify-start">
                <span className="text-green-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Presença (P)</span>
                <span className="text-red-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Falta (F)</span>
              </div>
            </div>

            {/* ======================= */}
            {/* VISUALIZAÇÃO UNIVERSAL (Tabela Clássica com Scroll Horizontal) */}
            {/* ======================= */}
            <div className="w-full overflow-x-auto custom-scrollbar pb-4 border-y md:border-none border-slate-100">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50/50 md:bg-transparent">
                  <tr>
                    <th className="p-3 md:p-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky left-0 bg-slate-50 md:bg-white z-10 w-28 md:w-48 min-w-[112px] md:min-w-[192px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Aluno</th>
                    {[...Array(diasNoMes)].map((_, i) => (
                      <th key={i} className="p-2 text-[9px] md:text-[10px] font-black text-slate-400 text-center border-b border-slate-100 min-w-[28px] md:min-w-[30px]">{i + 1}</th>
                    ))}
                    <th className="p-3 md:p-4 text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-100 text-center bg-blue-50/30">Faltas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {alunos.map(aluno => {
                    let totalFaltas = 0;
                    return (
                      <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 md:p-4 font-bold text-slate-700 text-[11px] md:text-xs sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-28 md:w-48 min-w-[112px] md:min-w-[192px]">
                          <div className="truncate" title={aluno.nome}>
                            {aluno.nome.split(' ')[0]} {aluno.nome.split(' ').slice(-1)}
                          </div>
                        </td>
                        {[...Array(diasNoMes)].map((_, i) => {
                          const dia = (i + 1).toString().padStart(2, '0');
                          const reg = frequenciaMensal.find(f => f.aluno_id === aluno.id && f.data === `${mesFiltro}-${dia}`);
                          
                          if (reg && reg.presente === false) totalFaltas++;

                          return (
                            <td key={i} className={`p-2 text-center text-[10px] md:text-[11px] font-black ${reg ? (reg.presente ? 'text-green-500' : 'text-red-500') : 'text-slate-200'}`}>
                              {reg ? (reg.presente ? 'P' : 'F') : '-'}
                            </td>
                          );
                        })}
                        <td className={`p-3 md:p-4 text-center font-black bg-blue-50/30 text-xs ${totalFaltas > 3 ? 'text-red-500' : 'text-slate-600'}`}>
                          {totalFaltas}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Botão de Impressão */}
            <div className="flex mt-6 md:mt-8 justify-center md:justify-end px-4 md:px-0">
              <button 
                onClick={() => window.print()} 
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              >
                <span className="text-sm md:text-base">🖨️</span> Imprimir Relatório
              </button>
            </div>

          </div>
        ) : (
          <div className="bg-white md:bg-transparent p-10 md:p-12 border-y md:border md:rounded-[2.5rem] border-slate-100 md:shadow-sm text-center mt-4 md:mt-0">
            <p className="text-[10px] md:text-xs font-black uppercase text-slate-400 tracking-widest">
              {!turmaSelecionada ? "Aguardando vinculação de turma." : "Nenhum aluno encontrado."}
            </p>
          </div>
        )}

      </div>

      {/* Adicionando estilo global para a barra de rolagem */}
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