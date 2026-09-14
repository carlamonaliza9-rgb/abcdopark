"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  CalendarDays, Filter, ChevronLeft, Printer, 
  X, CheckCircle2, XCircle, Info, Trash2, Edit3 
} from "lucide-react";

export default function RelatorioFrequenciaAdminPage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().substring(0, 7)); 
  const [frequenciaMensal, setFrequenciaMensal] = useState<any[]>([]);
  const [eventosMes, setEventosMes] = useState<any[]>([]); 
  const [carregando, setCarregando] = useState(true);
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);

  // --- ESTADOS DO MODAL DE EDIÇÃO ---
  const [modalEdicao, setModalEdicao] = useState<{alunoId: number, nomeAluno: string, dataIso: string, diaStr: string, atual: any} | null>(null);
  const [motivoFalta, setMotivoFalta] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

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
      .neq('status', 'transferido') 
      .order('nome', { ascending: true });

    if (listaAlunos) setAlunos(listaAlunos);

    const [ano, mes] = mesFiltro.split('-').map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();

    const [resFreq, resEventos] = await Promise.all([
      supabase.from('frequencias').select('*').gte('data', `${mesFiltro}-01`).lte('data', `${mesFiltro}-${ultimoDia}`),
      supabase.from('eventos_calendario').select('*').gte('data', `${mesFiltro}-01`).lte('data', `${mesFiltro}-${ultimoDia}`)
    ]);

    if (resFreq.data) setFrequenciaMensal(resFreq.data);
    if (resEventos.data) setEventosMes(resEventos.data);

    setCarregando(false);
  }

  async function handleSalvarRegistro(tipo: 'P' | 'F' | 'FJ' | 'remover') {
    if (!modalEdicao) return;
    setSalvandoEdicao(true);
    
    try {
      if (tipo === 'remover') {
        await supabase.from('frequencias')
          .delete()
          .eq('aluno_id', modalEdicao.alunoId)
          .eq('data', modalEdicao.dataIso);

        setFrequenciaMensal(prev => prev.filter(f => !(f.aluno_id === modalEdicao.alunoId && f.data === modalEdicao.dataIso)));
      } else {
        const justificativaFinal = tipo === 'FJ' ? (motivoFalta.trim() !== "" ? motivoFalta : 'Falta Justificada') : null;
        
        const payload = {
          aluno_id: modalEdicao.alunoId,
          data: modalEdicao.dataIso,
          presente: tipo === 'P',
          justificativa: justificativaFinal
        };
        
        await supabase.from('frequencias').upsert(payload, { onConflict: 'aluno_id, data' });

        setFrequenciaMensal(prev => {
          const existe = prev.find(f => f.aluno_id === modalEdicao.alunoId && f.data === modalEdicao.dataIso);
          if (existe) {
            return prev.map(f => f.aluno_id === modalEdicao.alunoId && f.data === modalEdicao.dataIso ? { ...f, ...payload } : f);
          } else {
            return [...prev, payload];
          }
        });
      }
      fecharModal();
    } catch (err) {
      alert("Erro ao salvar ajuste de frequência.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  function abrirModal(alunoId: number, nomeAluno: string, dataIso: string, diaStr: string, atual: any) {
    setModalEdicao({ alunoId, nomeAluno, dataIso, diaStr, atual });
    setMotivoFalta(atual?.justificativa || "");
  }

  function fecharModal() {
    setModalEdicao(null);
    setMotivoFalta("");
  }

  const [ano, mes] = mesFiltro.split('-').map(Number);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const nomeMes = new Date(ano, mes - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const obterDiaDaSemana = (diaNum: number) => {
    return new Date(ano, mes - 1, diaNum).getDay(); // 0 = Domingo, 6 = Sábado
  };

  // Identifica se o evento é feriado (verifica título ou tipo)
  const getEventoDoDia = (dataIso: string) => {
    return eventosMes.find(ev => ev.data === dataIso);
  };

  const ehFeriado = (dataIso: string) => {
    const ev = getEventoDoDia(dataIso);
    if (!ev) return false;
    const texto = `${ev.titulo || ''} ${ev.tipo || ''} ${ev.descricao || ''}`.toLowerCase();
    return texto.includes('feriado') || texto.includes('recesso') || texto.includes('confraternização') || texto.includes('independência') || texto.includes('natal') || texto.includes('ano novo') || texto.includes('finados') || texto.includes('trabalho');
  };

  const ehSabadoLetivo = (dataIso: string) => {
    const ev = getEventoDoDia(dataIso);
    if (!ev) return false;
    return !ehFeriado(dataIso); // Se tem evento e não é feriado, consideramos letivo/especial
  };

  if (verificandoAcesso) return <div className="p-10 text-center font-black uppercase text-slate-400 tracking-widest text-xs animate-pulse">Verificando...</div>;

  return (
    <div className="w-full min-h-screen bg-white md:bg-[#f4f7f9] p-4 md:p-8 lg:p-10 animate-in fade-in duration-500 overflow-x-hidden">
      
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
              className="w-full p-4 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm bg-white cursor-pointer"
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
              className="w-full p-4 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm bg-white cursor-pointer"
            />
          </div>
        </div>
      </header>

      {/* PAINEL DE DADOS */}
      <div className="bg-white md:rounded-[2.5rem] p-4 md:p-8 shadow-sm border border-slate-100 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 px-1">
            <h3 className="text-lg font-black text-slate-800 capitalize italic">{nomeMes}</h3>
            <div className="flex flex-wrap gap-4 text-[9px] font-black uppercase tracking-widest">
                <span className="text-green-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> Presença</span>
                <span className="text-amber-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Falta Justificada</span>
                <span className="text-red-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Falta</span>
                <span className="text-sky-600 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400"></span> Sábado Letivo</span>
                <span className="text-purple-600 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400"></span> Feriado</span>
                <span className="text-slate-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-200"></span> Sem Expediente</span>
            </div>
        </div>

        {/* TABELA RESPONSIVA */}
        <div className="w-full overflow-x-auto custom-scrollbar pb-4">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Aluno</th>
                {[...Array(diasNoMes)].map((_, i) => {
                  const diaNum = i + 1;
                  const dia = diaNum.toString().padStart(2, '0');
                  const dataIso = `${mesFiltro}-${dia}`;
                  const diaSemana = obterDiaDaSemana(diaNum);
                  const ehDomingo = diaSemana === 0;
                  const ehSabado = diaSemana === 6;
                  
                  const feriado = ehFeriado(dataIso);
                  const letivo = (ehSabado && ehSabadoLetivo(dataIso)) || (feriado && ehDomingo === false && ehSabado === false); 
                  // Nota: Feriados podem cair em dias úteis (lilás), Sábados letivos ficam em azul, domingos/sábados normais ficam neutros/limpos.
                  
                  const inativo = ehDomingo || (ehSabado && !ehSabadoLetivo(dataIso));

                  return (
                    <th 
                      key={i} 
                      className={`p-2 text-[10px] font-black text-center min-w-[30px] 
                        ${feriado ? 'bg-purple-100 text-purple-800' : letivo && ehSabado ? 'bg-sky-100 text-sky-800' : inativo ? 'text-slate-300 font-normal' : 'text-slate-500'}`}
                      title={feriado ? `Feriado: ${getEventoDoDia(dataIso)?.titulo || ''}` : ehDomingo ? 'Domingo' : ehSabado ? (letivo ? 'Sábado Letivo' : 'Sábado (Sem expediente)') : ''}
                    >
                      {diaNum}
                    </th>
                  );
                })}
                <th className="p-4 text-[10px] font-black text-blue-600 uppercase tracking-widest text-center">Faltas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {carregando ? (
                <tr><td colSpan={diasNoMes + 2} className="text-center p-8 font-black text-slate-300">Carregando...</td></tr>
              ) : alunos.map(aluno => {
                let faltas = 0;
                let justificadas = 0;

                return (
                  <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 font-bold text-slate-700 text-xs sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors line-clamp-1 truncate">
                      {aluno.nome.split(' ')[0]} {aluno.nome.split(' ').slice(-1)}
                    </td>
                    {[...Array(diasNoMes)].map((_, i) => {
                      const diaNum = i + 1;
                      const dia = diaNum.toString().padStart(2, '0');
                      const dataIso = `${mesFiltro}-${dia}`;
                      const reg = frequenciaMensal.find(f => f.aluno_id === aluno.id && f.data === dataIso);
                      
                      const diaSemana = obterDiaDaSemana(diaNum);
                      const ehDomingo = diaSemana === 0;
                      const ehSabado = diaSemana === 6;
                      
                      const feriado = ehFeriado(dataIso);
                      const sabadoLetivo = ehSabado && ehSabadoLetivo(dataIso);
                      const inativo = ehDomingo || (ehSabado && !sabadoLetivo);

                      if (reg && reg.presente === false && !inativo && !feriado) {
                        if (reg.justificativa) justificadas++;
                        else faltas++;
                      }

                      return (
                        <td 
                          key={i} 
                          onClick={() => {
                            if (inativo || feriado) return; // Bloqueia clique em feriados e dias sem expediente
                            abrirModal(aluno.id, aluno.nome, dataIso, String(diaNum), reg);
                          }}
                          className={`p-2 text-center text-[10px] font-black transition-all
                            ${feriado ? 'bg-purple-50 text-purple-400 cursor-not-allowed' : inativo ? 'text-slate-200 cursor-not-allowed' : sabadoLetivo ? 'bg-sky-50/60 hover:bg-sky-100 cursor-pointer' : 'cursor-pointer hover:bg-slate-100 hover:scale-110 active:scale-95'}
                            ${reg && !inativo && !feriado ? (reg.presente ? 'text-green-500' : reg.justificativa ? 'text-amber-500' : 'text-red-500') : ''}`
                          }
                          title={feriado ? `Feriado (${getEventoDoDia(dataIso)?.titulo || ''})` : inativo ? 'Sem expediente' : `Dia ${dia}${reg?.justificativa ? `\nMotivo: ${reg.justificativa}` : ''}`}
                        >
                          {feriado ? '•' : inativo ? '·' : (reg ? (reg.presente ? 'P' : reg.justificativa ? 'FJ' : 'F') : '-')}
                        </td>
                      );
                    })}
                    <td className={`p-4 text-center font-black ${faltas > 3 ? 'text-red-500' : 'text-slate-600'}`}>
                      {faltas} 
                      {justificadas > 0 && <span className="text-amber-500 text-[9px] ml-1.5 whitespace-nowrap drop-shadow-sm">(+{justificadas} FJ)</span>}
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
            <Printer size={16} strokeWidth={2.5} /> Imprimir Relatório
          </button>
          <button 
            onClick={() => router.push('/admin/alunos')} 
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
          >
            <ChevronLeft size={16} strokeWidth={2.5} /> Voltar para Alunos
          </button>
        </div>
      </div>

      {/* ================= MODAL DE AJUSTE DE FREQUÊNCIA ================= */}
      {modalEdicao && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 print:hidden"
          onClick={fecharModal}
        >
          <div 
            className="bg-white p-6 md:p-8 rounded-[2rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Ajustar Frequência</h3>
                <p className="text-[11px] font-bold text-blue-600 mt-1">Dia {modalEdicao.diaStr} de {nomeMes}</p>
              </div>
              <button onClick={fecharModal} className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full transition-colors">
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Aluno(a)</p>
              <p className="text-sm font-bold text-slate-700 leading-tight">{modalEdicao.nomeAluno}</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => handleSalvarRegistro('P')}
                disabled={salvandoEdicao}
                className="w-full py-3.5 px-4 rounded-xl bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 size={16} strokeWidth={2.5} /> Marcar Presença (P)
              </button>
              
              <div className="w-full p-4 rounded-xl bg-amber-50/50 border border-amber-100 flex flex-col gap-3">
                <div className="w-full">
                  <label className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1.5 flex items-center gap-1"><Edit3 size={12}/> Motivo da falta</label>
                  <textarea 
                    rows={2}
                    placeholder="Ex: Atestado médico, Viagem..."
                    value={motivoFalta}
                    onChange={(e) => setMotivoFalta(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-amber-200/60 bg-white text-xs font-bold text-slate-700 outline-none focus:border-amber-400 resize-none custom-scrollbar placeholder:text-slate-300"
                  />
                </div>
                <button 
                  onClick={() => handleSalvarRegistro('FJ')}
                  disabled={salvandoEdicao}
                  className="w-full py-3 px-4 rounded-lg bg-amber-400 hover:bg-amber-500 text-amber-950 font-black uppercase tracking-widest text-[10px] flex justify-center items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
                >
                  <Info size={14} strokeWidth={2.5} /> Salvar como Justificada (FJ)
                </button>
              </div>

              <button 
                onClick={() => handleSalvarRegistro('F')}
                disabled={salvandoEdicao}
                className="w-full py-3.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-colors disabled:opacity-50"
              >
                <XCircle size={16} strokeWidth={2.5} /> Marcar Falta (F)
              </button>

              <div className="h-px bg-slate-100 my-1 w-full"></div>

              <button 
                onClick={() => handleSalvarRegistro('remover')}
                disabled={salvandoEdicao || !modalEdicao.atual}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
              >
                <Trash2 size={14} strokeWidth={2.5} /> Limpar Célula
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 4px; }
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