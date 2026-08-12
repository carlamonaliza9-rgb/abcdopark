"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase"; 
import { 
  CalendarDays, Printer, X, CheckCircle2, 
  XCircle, Info, Trash2, Edit3, Upload, ChevronDown 
} from "lucide-react";

export default function ConsultaFrequenciaPage() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().substring(0, 7)); // Formato YYYY-MM
  const [frequenciaMensal, setFrequenciaMensal] = useState<any[]>([]);
  const [eventosMes, setEventosMes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // --- ESTADOS DO MODAL DE EDIÇÃO DE FALTA JUSTIFICADA ---
  const [modalEdicao, setModalEdicao] = useState<{alunoId: number, nomeAluno: string, dataIso: string, diaStr: string, atual: any} | null>(null);
  const [motivoFalta, setMotivoFalta] = useState("");
  const [arquivoComprovante, setArquivoComprovante] = useState<File | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // --- ESTADOS DE IMPRESSÃO AVANÇADA ---
  const [menuImprimirAberto, setMenuImprimirAberto] = useState(false);
  const [imprimindoAnoInteiro, setImprimindoAnoInteiro] = useState(false);
  const [frequenciaAnoInteiro, setFrequenciaAnoInteiro] = useState<any[]>([]);
  const [eventosAnoInteiro, setEventosAnoInteiro] = useState<any[]>([]);
  const [carregandoAno, setCarregandoAno] = useState(false);

  // A turma vem do Diário de Classe. A Frequência não possui seletor próprio.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const turmaDaUrl = params.get("turma");

      if (turmaDaUrl) {
        setTurmaSelecionada(turmaDaUrl);
      } else {
        console.warn("Nenhuma turma foi informada pelo Diário de Classe.");
      }
    } catch (err) {
      console.error("Erro ao recuperar a turma selecionada:", err);
    } finally {
      setCarregando(false);
    }
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
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
    } finally {
      setCarregando(false);
    }
  }

  async function handleCicloCliques(alunoId: number, dataIso: string, regAtual: any) {
    try {
      let novoPayload: any = null;

      if (!regAtual) {
        novoPayload = { aluno_id: alunoId, data: dataIso, presente: true, justificativa: null };
      } else if (regAtual.presente === true) {
        novoPayload = { aluno_id: alunoId, data: dataIso, presente: false, justificativa: null };
      } else if (regAtual.presente === false && !regAtual.justificativa) {
        const alunoObj = alunos.find(a => a.id === alunoId);
        const diaStr = dataIso.split('-')[2];
        abrirModal(alunoId, alunoObj?.nome || "Aluno", dataIso, diaStr, regAtual);
        return;
      } else {
        await supabase.from('frequencias').delete().eq('aluno_id', alunoId).eq('data', dataIso);
        setFrequenciaMensal(prev => prev.filter(f => !(f.aluno_id === alunoId && f.data === dataIso)));
        return;
      }

      await supabase.from('frequencias').upsert(novoPayload, { onConflict: 'aluno_id, data' });
      
      setFrequenciaMensal(prev => {
        const existe = prev.find(f => f.aluno_id === alunoId && f.data === dataIso);
        if (existe) {
          return prev.map(f => f.aluno_id === alunoId && f.data === dataIso ? { ...f, ...novoPayload } : f);
        } else {
          return [...prev, novoPayload];
        }
      });
    } catch (err) {
      console.error("Erro ao alterar frequência por clique:", err);
    }
  }

  async function handleSalvarJustificativa(tipo: 'FJ' | 'remover') {
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
        let justificativaTexto = motivoFalta.trim() !== "" ? motivoFalta : 'Falta Justificada';
        let finalJustificativa = justificativaTexto;

        if (arquivoComprovante) {
          const fileExt = arquivoComprovante.name.split('.').pop();
          const fileName = `justificativa_${modalEdicao.alunoId}_${modalEdicao.dataIso}_${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('documentos')
            .upload(fileName, arquivoComprovante);

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('documentos')
              .getPublicUrl(fileName);
            
            if (publicUrlData?.publicUrl) {
              finalJustificativa = `${justificativaTexto} [Comprovante: ${publicUrlData.publicUrl}]`;
            }
          } else {
            console.error("Erro no upload:", uploadError);
            alert("Aviso: Falha ao enviar o arquivo, mas a justificativa de texto será salva.");
          }
        }

        const payload = {
          aluno_id: modalEdicao.alunoId,
          data: modalEdicao.dataIso,
          presente: false,
          justificativa: finalJustificativa
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
      alert("Erro ao salvar justificativa.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  function abrirModal(alunoId: number, nomeAluno: string, dataIso: string, diaStr: string, atual: any) {
    setModalEdicao({ alunoId, nomeAluno, dataIso, diaStr, atual });
    setMotivoFalta(atual?.justificativa || "");
    setArquivoComprovante(null);
  }

  function fecharModal() {
    setModalEdicao(null);
    setMotivoFalta("");
    setArquivoComprovante(null);
  }

  // Funções de Impressão
  async function handleImprimirAno() {
    setMenuImprimirAberto(false);
    setCarregandoAno(true);
    try {
      const [ano] = mesFiltro.split('-').map(Number);
      const primeiroDiaAno = `${ano}-01-01`;
      const ultimoDiaAno = `${ano}-12-31`;

      const [resFreq, resEventos] = await Promise.all([
        supabase.from('frequencias').select('*').gte('data', primeiroDiaAno).lte('data', ultimoDiaAno),
        supabase.from('eventos_calendario').select('*').gte('data', primeiroDiaAno).lte('data', ultimoDiaAno)
      ]);

      if (resFreq.data) setFrequenciaAnoInteiro(resFreq.data);
      if (resEventos.data) setEventosAnoInteiro(resEventos.data);

      setImprimindoAnoInteiro(true);
      setTimeout(() => {
        window.print();
        setImprimindoAnoInteiro(false);
      }, 800);
    } catch (err) {
      console.error("Erro ao carregar dados do ano:", err);
      alert("Erro ao preparar impressão anual.");
    } finally {
      setCarregandoAno(false);
    }
  }

  function handleImprimirMes() {
    setMenuImprimirAberto(false);
    setImprimindoAnoInteiro(false);
    setTimeout(() => {
      window.print();
    }, 300);
  }

  // MAPAS DE ACESSO INSTANTÂNEO (Otimização Extrema de Performance)
  const freqAnoMapa = useMemo(() => {
    const map: any = {};
    for (const f of frequenciaAnoInteiro) {
      map[`${f.aluno_id}_${f.data}`] = f;
    }
    return map;
  }, [frequenciaAnoInteiro]);

  const eventosAnoMapa = useMemo(() => {
    const map: any = {};
    for (const ev of eventosAnoInteiro) {
      map[ev.data] = ev;
    }
    return map;
  }, [eventosAnoInteiro]);

  const [anoFiltro, mesNum] = mesFiltro.split('-').map(Number);
  const diasNoMes = new Date(anoFiltro, mesNum, 0).getDate();
  const nomeMes = new Date(anoFiltro, mesNum - 1, 1).toLocaleString('pt-BR', { month: 'long' });

  const obterDiaDaSemana = (ano: number, mes: number, diaNum: number) => {
    return new Date(ano, mes - 1, diaNum).getDay();
  };

  const getEventoDoDia = (dataIso: string, usandoAnoInteiro = false) => {
    if (usandoAnoInteiro) {
      return eventosAnoMapa[dataIso];
    }
    return eventosMes.find(ev => ev.data === dataIso);
  };

  const ehFeriado = (dataIso: string, usandoAnoInteiro = false) => {
    const ev = getEventoDoDia(dataIso, usandoAnoInteiro);
    if (!ev) return false;
    const texto = `${ev.titulo || ''} ${ev.tipo || ''} ${ev.descricao || ''}`.toLowerCase();
    return texto.includes('feriado') || texto.includes('recesso') || texto.includes('confraternização') || texto.includes('independência') || texto.includes('natal') || texto.includes('ano novo') || texto.includes('finados') || texto.includes('trabalho');
  };

  const ehSabadoLetivo = (dataIso: string, usandoAnoInteiro = false) => {
    const ev = getEventoDoDia(dataIso, usandoAnoInteiro);
    if (!ev) return false;
    return !ehFeriado(dataIso, usandoAnoInteiro);
  };

  const dataCorteRestricao = new Date('2026-08-01T00:00:00');

  if (carregando && alunos.length === 0) {
    return <div className="min-h-screen bg-white md:bg-slate-50 p-10 flex items-center justify-center text-slate-400 font-black uppercase tracking-widest animate-pulse text-xs">Buscando pauta...</div>;
  }

  return (
    <div className="w-full min-h-screen bg-white md:bg-slate-50 md:p-8 font-sans pb-24 animate-in fade-in duration-500 overflow-x-hidden">
      
      <div className="w-full max-w-[1600px] mx-auto">
        
        {/* ================= HEADER & FILTROS ================= */}
        <header className="bg-white md:rounded-[2rem] px-4 pt-6 pb-4 md:p-6 md:shadow-sm border-b md:border border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 md:mb-8 print:hidden">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-blue-900 uppercase tracking-tighter italic">Frequência 📋</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
              Turma: {turmaSelecionada || "Nenhuma selecionada"}
            </p>
          </div>
          
          <div className="flex flex-col gap-1.5 md:gap-2 bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-2xl md:rounded-none">
            <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 md:px-0">Selecionar Mês</label>
            <input 
              type="month" 
              value={mesFiltro} 
              onChange={(e) => setMesFiltro(e.target.value)} 
              className="p-3 md:p-3 rounded-xl border border-slate-200 text-sm font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-100 md:focus:border-blue-400 transition-colors bg-white md:bg-slate-50 shadow-sm md:shadow-none cursor-pointer"
            />
          </div>
        </header>

        {/* ================= TABELA DE DADOS ================= */}
        {turmaSelecionada && alunos.length > 0 ? (
          <div className="bg-white md:p-8 md:rounded-[2.5rem] md:shadow-sm md:border border-slate-100 print-container">
            
            {/* CABEÇALHO PARA IMPRESSÃO (Visível apenas ao imprimir) */}
            <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
              <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">Escola ABC do Park</h2>
              <p className="text-xs font-bold text-slate-600">Relatório de Frequência - Turma: {turmaSelecionada}</p>
              <p className="text-xs font-black text-blue-800 mt-1">
                {imprimindoAnoInteiro ? `Ano Letivo: ${anoFiltro}` : `Mês de Referência: ${nomeMes.toUpperCase()} / ${anoFiltro}`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 mb-4 md:mb-8 px-4 md:px-0 print:hidden">
              <h3 className="text-lg md:text-xl font-black text-blue-900 capitalize italic">{nomeMes} de {anoFiltro}</h3>
              
              {/* LEGENDA */}
              <div className="flex flex-wrap gap-3 md:gap-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-slate-50 md:bg-transparent p-2 md:p-0 rounded-lg md:rounded-none w-full sm:w-auto justify-center sm:justify-start">
                <span className="text-green-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Presença (P)</span>
                <span className="text-amber-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Falta Justificada (FJ)</span>
                <span className="text-red-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Falta (F)</span>
                <span className="text-sky-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400"></span> Sábado Letivo</span>
                <span className="text-purple-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span> Feriado</span>
              </div>
            </div>

            {/* SE IMPRIMINDO ANO INTEIRO: RENDERIZA OS 12 MESES */}
            {imprimindoAnoInteiro ? (
              <div className="flex flex-col gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                  const diasDoMesM = new Date(anoFiltro, m, 0).getDate();
                  const nomeMesM = new Date(anoFiltro, m - 1, 1).toLocaleString('pt-BR', { month: 'long' });

                  return (
                    <div key={m} className="month-block">
                      <h4 className="text-sm font-black text-blue-900 uppercase mb-2 border-b border-blue-100 pb-1">
                        {nomeMesM} / {anoFiltro}
                      </h4>
                      <div className="w-full overflow-x-auto">
                        <table className="w-full table-fixed text-left border-collapse text-[9px]">
                          <thead>
                            <tr>
                              <th className="p-1.5 border border-slate-200 w-36 font-black text-slate-500">Aluno</th>
                              {[...Array(31)].map((_, i) => {
                                const diaNum = i + 1;
                                
                                if (diaNum > diasDoMesM) {
                                  return <th key={i} className="p-1 border border-slate-200 bg-slate-100 w-5"></th>;
                                }

                                const dataIso = `${anoFiltro}-${String(m).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
                                const diaSemana = obterDiaDaSemana(anoFiltro, m, diaNum);
                                const ehDomingo = diaSemana === 0;
                                const ehSabado = diaSemana === 6;
                                const feriado = ehFeriado(dataIso, true);
                                const letivo = (ehSabado && ehSabadoLetivo(dataIso, true)) || (feriado && !ehDomingo && !ehSabado);
                                const inativo = ehDomingo || (ehSabado && !ehSabadoLetivo(dataIso, true));

                                return (
                                  <th key={i} className={`p-1 border border-slate-200 text-center w-5 text-[8px] font-black
                                    ${feriado ? 'bg-purple-100 text-purple-800' : letivo && ehSabado ? 'bg-sky-100 text-sky-800' : inativo ? 'bg-slate-50 text-slate-300 font-normal' : 'text-slate-500'}`}
                                  >
                                    {diaNum}
                                  </th>
                                );
                              })}
                              <th className="p-1.5 border border-slate-200 text-center text-blue-600 font-black w-12">Faltas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {alunos.map(aluno => {
                              let faltasM = 0;
                              let justificadasM = 0;

                              return (
                                <tr key={aluno.id}>
                                  <td className="p-1.5 border border-slate-200 font-bold truncate max-w-[140px] text-slate-700">
                                    {aluno.nome.split(' ')[0]} {aluno.nome.split(' ').slice(-1)}
                                  </td>
                                  {[...Array(31)].map((_, i) => {
                                    const diaNum = i + 1;
                                    
                                    if (diaNum > diasDoMesM) {
                                      return <td key={i} className="p-1 border border-slate-200 bg-slate-100"></td>;
                                    }

                                    const dataIso = `${anoFiltro}-${String(m).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
                                    const reg = freqAnoMapa[`${aluno.id}_${dataIso}`];
                                    
                                    const diaSemana = obterDiaDaSemana(anoFiltro, m, diaNum);
                                    const feriado = ehFeriado(dataIso, true);
                                    const sabadoLetivo = diaSemana === 6 && ehSabadoLetivo(dataIso, true);
                                    const inativo = diaSemana === 0 || (diaSemana === 6 && !sabadoLetivo);

                                    if (reg && reg.presente === false && !inativo && !feriado) {
                                      if (reg.justificativa) justificadasM++;
                                      else faltasM++;
                                    }

                                    return (
                                      <td key={i} className={`p-1 border border-slate-200 text-center font-bold text-[9px]
                                        ${feriado ? 'bg-purple-50 text-purple-400' : inativo ? 'bg-slate-50 text-slate-200' : sabadoLetivo ? 'bg-sky-50' : ''}
                                        ${reg && !inativo && !feriado ? (reg.presente ? 'text-green-600' : reg.justificativa ? 'text-amber-500' : 'text-red-500') : ''}`
                                      }>
                                        {feriado ? '•' : inativo ? '·' : (reg ? (reg.presente ? 'P' : reg.justificativa ? 'FJ' : 'F') : '-')}
                                      </td>
                                    );
                                  })}
                                  <td className={`p-1.5 border border-slate-200 text-center font-black ${faltasM > 3 ? 'text-red-500' : 'text-slate-600'}`}>
                                    {faltasM} {justificadasM > 0 && <span className="text-amber-500">({justificadasM})</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* MODO PADRÃO / MÊS SELECIONADO */
              <div className="w-full overflow-x-auto custom-scrollbar pb-4 border-y md:border-none border-slate-100">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-slate-50/50 md:bg-transparent">
                    <tr>
                      <th className="p-3 md:p-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky left-0 bg-slate-50 md:bg-white z-10 w-28 md:w-48 min-w-[112px] md:min-w-[192px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Aluno</th>
                      {[...Array(31)].map((_, i) => {
                        const diaNum = i + 1;
                        if (diaNum > diasNoMes) {
                          return <th key={i} className="p-2 border-b border-slate-100 bg-slate-50/50 min-w-[28px] md:min-w-[30px]"></th>;
                        }

                        const dataIso = `${mesFiltro}-${diaNum.toString().padStart(2, '0')}`;
                        const diaSemana = obterDiaDaSemana(anoFiltro, mesNum, diaNum);
                        const ehDomingo = diaSemana === 0;
                        const ehSabado = diaSemana === 6;
                        
                        const feriado = ehFeriado(dataIso);
                        const letivo = (ehSabado && ehSabadoLetivo(dataIso)) || (feriado && !ehDomingo && !ehSabado);
                        const inativo = ehDomingo || (ehSabado && !ehSabadoLetivo(dataIso));

                        return (
                          <th 
                            key={i} 
                            className={`p-2 text-[9px] md:text-[10px] font-black text-center border-b border-slate-100 min-w-[28px] md:min-w-[30px]
                              ${feriado ? 'bg-purple-100 text-purple-800' : letivo && ehSabado ? 'bg-sky-100 text-sky-800' : inativo ? 'text-slate-300 font-normal' : 'text-slate-400'}`}
                          >
                            {diaNum}
                          </th>
                        );
                      })}
                      <th className="p-3 md:p-4 text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-100 text-center bg-blue-50/30">Faltas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {alunos.map(aluno => {
                      let faltas = 0;
                      let justificadas = 0;

                      return (
                        <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 md:p-4 font-bold text-slate-700 text-[11px] md:text-xs sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-28 md:w-48 min-w-[112px] md:min-w-[192px]">
                            <div className="truncate" title={aluno.nome}>
                              {aluno.nome.split(' ')[0]} {aluno.nome.split(' ').slice(-1)}
                            </div>
                          </td>
                          {[...Array(31)].map((_, i) => {
                            const diaNum = i + 1;
                            
                            if (diaNum > diasNoMes) {
                              return <td key={i} className="p-2 border-b border-slate-50 bg-slate-50/30"></td>;
                            }

                            const dia = diaNum.toString().padStart(2, '0');
                            const dataIso = `${mesFiltro}-${dia}`;
                            const reg = frequenciaMensal.find(f => f.aluno_id === aluno.id && f.data === dataIso);
                            
                            const diaSemana = obterDiaDaSemana(anoFiltro, mesNum, diaNum);
                            const ehDomingo = diaSemana === 0;
                            const ehSabado = diaSemana === 6;
                            
                            const feriado = ehFeriado(dataIso);
                            const sabadoLetivo = ehSabado && ehSabadoLetivo(dataIso);
                            const inativo = ehDomingo || (ehSabado && !sabadoLetivo);

                            if (reg && reg.presente === false && !inativo && !feriado) {
                              if (reg.justificativa) justificadas++;
                              else faltas++;
                            }

                            const dataCelObj = new Date(dataIso + 'T00:00:00');
                            const ehPeriodoAntigo = dataCelObj < dataCorteRestricao;

                            return (
                              <td 
                                key={i} 
                                onClick={() => {
                                  if (inativo || feriado) return; 
                                  if (ehPeriodoAntigo) {
                                    handleCicloCliques(aluno.id, dataIso, reg);
                                  } else {
                                    abrirModal(aluno.id, aluno.nome, dataIso, String(diaNum), reg);
                                  }
                                }}
                                className={`p-2 text-center text-[10px] md:text-[11px] font-black transition-all
                                  ${feriado ? 'bg-purple-50 text-purple-400 cursor-not-allowed' : inativo ? 'text-slate-200 cursor-not-allowed' : sabadoLetivo ? 'bg-sky-50/60 hover:bg-sky-100 cursor-pointer' : 'cursor-pointer hover:bg-slate-100 hover:scale-110 active:scale-95'}
                                  ${reg && !inativo && !feriado ? (reg.presente ? 'text-green-500' : reg.justificativa ? 'text-amber-500' : 'text-red-500') : 'text-slate-300'}`
                                }
                              >
                                {feriado ? '•' : inativo ? '·' : (reg ? (reg.presente ? 'P' : reg.justificativa ? 'FJ' : 'F') : '-')}
                              </td>
                            );
                          })}
                          <td className={`p-3 md:p-4 text-center font-black bg-blue-50/30 text-xs ${faltas > 3 ? 'text-red-500' : 'text-slate-600'}`}>
                            {faltas} 
                            {justificadas > 0 && <span className="text-amber-500 text-[9px] ml-1.5 whitespace-nowrap drop-shadow-sm">(+{justificadas} FJ)</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Botão de Impressão com Menu Desdobrável */}
            <div className="flex mt-6 md:mt-8 justify-center md:justify-end px-4 md:px-0 print:hidden relative">
              <div className="relative">
                <button 
                  onClick={() => setMenuImprimirAberto(!menuImprimirAberto)} 
                  disabled={carregandoAno}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <span className="text-sm md:text-base">🖨️</span> {carregandoAno ? "Carregando Ano..." : "Opções de Impressão"} <ChevronDown size={14} />
                </button>

                {menuImprimirAberto && (
                  <div className="absolute right-0 bottom-full mb-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95">
                    <button 
                      onClick={handleImprimirMes}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2"
                    >
                      📅 Imprimir apenas {nomeMes}
                    </button>
                    <button 
                      onClick={handleImprimirAno}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 border-t border-slate-100"
                    >
                      📚 Imprimir o Ano Inteiro
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white md:bg-transparent p-10 md:p-12 border-y md:border md:rounded-[2.5rem] border-slate-100 md:shadow-sm text-center mt-4 md:mt-0">
            <p className="text-[10px] md:text-xs font-black uppercase text-slate-400 tracking-widest">
              {!turmaSelecionada
              ? "Abra o relatório pelo Diário de Classe após selecionar uma turma."
              : "Nenhum aluno encontrado."}
            </p>
          </div>
        )}

      </div>

      {/* ================= MODAL DE AJUSTE DE FALTA JUSTIFICADA ================= */}
      {modalEdicao && (() => {
        const dataModalObj = new Date(modalEdicao.dataIso + 'T00:00:00');
        const ehRestrito = dataModalObj >= dataCorteRestricao;

        return (
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
                  <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Justificar Falta</h3>
                  <p className="text-[11px] font-bold text-blue-600 mt-1">Dia {modalEdicao.diaStr} de {nomeMes}</p>
                </div>
                <button onClick={fecharModal} className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={16} strokeWidth={3} />
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Aluno(a)</p>
                <p className="text-sm font-bold text-slate-700 leading-tight">{modalEdicao.nomeAluno}</p>
                {ehRestrito && (
                  <p className="text-[9px] font-bold text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
                    ℹ️ A partir de agosto de 2026, alterações de presença e falta diária devem ser feitas na pauta oficial do dia. Aqui você pode apenas adicionar/editar a Falta Justificada.
                  </p>
                )}
              </div>
              
              <div className="flex flex-col gap-3">
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

                  <div className="w-full">
                    <label className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1.5 flex items-center gap-1">
                      <Upload size={12}/> Comprovante (Foto ou PDF)
                    </label>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={(e) => setArquivoComprovante(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs font-bold text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                    />
                  </div>

                  <button 
                    onClick={() => handleSalvarJustificativa('FJ')}
                    disabled={salvandoEdicao}
                    className="w-full py-3 px-4 rounded-lg bg-amber-400 hover:bg-amber-500 text-amber-950 font-black uppercase tracking-widest text-[10px] flex justify-center items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <Info size={14} strokeWidth={2.5} /> 
                    {salvandoEdicao ? "Salvando e Enviando..." : "Salvar como Justificada (FJ)"}
                  </button>
                </div>

                <button 
                  onClick={() => handleSalvarJustificativa('remover')}
                  disabled={salvandoEdicao || !modalEdicao.atual}
                  className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={14} strokeWidth={2.5} /> Remover / Apagar Registro
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @media print {
          @page { size: landscape; margin: 1cm; }
          body * { visibility: hidden; }
          .print-container, .print-container * { 
            visibility: visible; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; background: white; }
          .month-block { page-break-inside: avoid; break-inside: avoid; margin-bottom: 2rem; }
        }
      `}} />
    </div>
  );
}