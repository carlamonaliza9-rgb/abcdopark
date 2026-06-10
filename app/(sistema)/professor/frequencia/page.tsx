"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Importação corrigida (não use createClient dentro do componente)

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
    return <div className="p-10 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Buscando pauta...</div>;
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-24">
      
      <header className="mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-blue-900 uppercase tracking-tighter italic">Frequência 📋</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Turma Vinculada: {turmaSelecionada || "Nenhuma"}</p>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecionar Mês</label>
          <input 
            type="month" 
            value={mesFiltro} 
            onChange={(e) => setMesFiltro(e.target.value)} 
            className="p-3 rounded-xl border border-slate-200 text-sm font-bold text-blue-900 outline-none focus:border-blue-400 transition-colors bg-slate-50"
          />
        </div>
      </header>

      {turmaSelecionada && alunos.length > 0 ? (
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h3 className="text-xl font-black text-blue-900 capitalize italic">{nomeMes} {anoFiltro}</h3>
            <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
              <span className="text-green-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Presença (P)</span>
              <span className="text-red-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Falta (F)</span>
            </div>
          </div>

          {/* ======================= */}
          {/* VISUALIZAÇÃO UNIVERSAL (Tabela Clássica com Scroll Horizontal) */}
          {/* ======================= */}
          <div className="w-full overflow-x-auto custom-scrollbar pb-4">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky left-0 bg-white z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Aluno</th>
                  {[...Array(diasNoMes)].map((_, i) => (
                    <th key={i} className="p-2 text-[10px] font-black text-slate-400 text-center border-b border-slate-100 min-w-[30px]">{i + 1}</th>
                  ))}
                  <th className="p-4 text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-100 text-center bg-blue-50/30">Faltas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {alunos.map(aluno => {
                  let totalFaltas = 0;
                  return (
                    <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-700 text-xs sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
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
                      <td className={`p-4 text-center font-black bg-blue-50/30 ${totalFaltas > 3 ? 'text-red-500' : 'text-slate-600'}`}>
                        {totalFaltas}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Botão de Impressão */}
          <div className="flex mt-8 justify-end">
            <button 
              onClick={() => window.print()} 
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95"
            >
              🖨️ Imprimir Relatório
            </button>
          </div>

        </div>
      ) : (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-50 shadow-sm text-center">
          <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">
            {!turmaSelecionada ? "Aguardando vinculação de turma." : "Nenhum aluno encontrado."}
          </p>
        </div>
      )}

      {/* Adicionando estilo global para a barra de rolagem (Tailwind hide-scrollbar custom) */}
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