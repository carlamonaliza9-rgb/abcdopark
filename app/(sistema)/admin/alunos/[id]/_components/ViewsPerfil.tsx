"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clean, calcularIdade, obterMediaFinal, extrairFormaPagamento, mCPF, mWhatsApp, abrirWhatsApp } from "./alunoUtils";

export function BannerAluno({ aluno, router, ehVisitante, abrirEdicaoFicha, onExcluir }: any) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-10"></div>
      <div className="p-6 md:p-4 relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
        <button onClick={() => router.push('/admin/alunos')} className="absolute top-6 left-6 md:static bg-white border border-slate-200 text-slate-500 hover:text-slate-800 p-2 md:p-3 rounded-xl shadow-sm transition-all" title="Voltar para listagem">
          ← Voltar
        </button>
        <div className="relative">
          {aluno.foto_url ? (
            <img src={aluno.foto_url} className="w-32 h-32 md:w-44 md:h-44 rounded-full object-cover border-4 border-white shadow-md" alt={aluno.nome} />
          ) : (
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-5xl md:text-6xl border-4 border-white shadow-md">👤</div>
          )}
          {aluno.e_autista && <span className="absolute bottom-0 right-0 text-2xl md:text-3xl bg-white rounded-full p-1 shadow-sm border border-slate-100" title="TEA">🧩</span>}
        </div>
        <div className="flex-1 text-center md:text-left flex flex-col md:flex-row justify-between w-full">
          <div>
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black tracking-wider rounded-lg mb-2 uppercase border border-blue-100">Matrícula Ativa</div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">{aluno.nome}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
              <span className="text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">{calcularIdade(aluno.data_nascimento)}</span>
              <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">{aluno.turma} • {aluno.turno || 'Turno não inf.'}</span>
            </div>
          </div>
          {!ehVisitante && (
            <div className="mt-6 md:mt-0 flex justify-center md:justify-end items-center gap-3">
              <button onClick={abrirEdicaoFicha} className="bg-gray-100 hover:bg-blue-200 text-gray-700 font-bold px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2">
                ✏️ Editar Ficha
              </button>
              
              {onExcluir && (
                <button 
                  onClick={onExcluir} 
                  className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white font-bold px-4 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 border border-rose-200"
                  title="Excluir Permanentemente o Aluno"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Excluir Ficha
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ModalObservacoesDiario({ alunoId, onClose, mediaCalculada }: any) {
  const [observacoes, setObservacoes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscarAlertas() {
      const { data } = await supabase
        .from('avaliacoes')
        .select('data_avaliacao, participacao, comportamento, atividades, socioemocional, comentario')
        .eq('aluno_id', alunoId)
        .order('data_avaliacao', { ascending: false });

      if (data) {
        const comAlertas = data.filter(obs => obs.comentario && obs.comentario.trim().length > 0);
        setObservacoes(comAlertas);
      }
      setCarregando(false);
    }
    buscarAlertas();
  }, [alunoId]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden" onClick={e => e.stopPropagation()}>
        
        <div className="bg-indigo-400 p-6 border-b border-indigo-400 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>⭐</span> Diário de Desempenho
            </h2>
            <p className="text-indigo-100 text-[11px] font-bold uppercase tracking-widest mt-1">Registros Pedagógicos</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg active:scale-95">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50">
          {carregando ? (
            <div className="text-center p-10 text-indigo-400 font-bold text-xs uppercase tracking-widest animate-pulse">Consultando registros...</div>
          ) : (
            <div className="space-y-6">
              
              <div className="flex flex-col items-center justify-center bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Média Geral do Aluno</span>
                <div className="text-3xl font-black text-indigo-700">
                  {mediaCalculada > 0 ? mediaCalculada.toFixed(1) : "—"}
                  <span className="text-sm text-slate-300 font-medium ml-1">/ 5.0</span>
                </div>
                <div className="mt-2 flex gap-1">
                   {mediaCalculada > 0 && Array.from({length: 5}).map((_, i) => (
                     <span key={i} className={`text-base ${i < Math.round(mediaCalculada) ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
                   ))}
                </div>
              </div>

              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
                Alertas e Observações
              </h3>

              {observacoes.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {observacoes.map((obs, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative group transition-all hover:border-indigo-100">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-400 rounded-l-2xl"></div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                          🗓️ {new Date(obs.data_avaliacao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-600 leading-relaxed mb-4 italic">"{obs.comentario}"</p>
                      
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-50">
                        {obs.participacao <= 3 && obs.participacao > 0 && <span className="bg-rose-50 text-rose-600 text-[9px] font-black px-2 py-1 rounded border border-rose-100 uppercase">Part: {obs.participacao}★</span>}
                        {obs.comportamento <= 3 && obs.comportamento > 0 && <span className="bg-rose-50 text-rose-600 text-[9px] font-black px-2 py-1 rounded border border-rose-100 uppercase">Comp: {obs.comportamento}★</span>}
                        {obs.atividades <= 3 && obs.atividades > 0 && <span className="bg-rose-50 text-rose-600 text-[9px] font-black px-2 py-1 rounded border border-rose-100 uppercase">Ativ: {obs.atividades}★</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-400">Nenhum comentário registrado.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function VisaoGeralAluno({ aluno, saldoCreditoVisivel, setVerCreditoGlobal, totalPendenteGeral, setVerDividasGlobais, percentualPresenca, router, alunoId, setVerBoletim, setVerHistorico, setVerRelatorios }: any) {
  const [modalObsAberto, setModalObsAberto] = useState(false);
  const [mediaReal, setMediaReal] = useState(0);

  useEffect(() => {
    async function buscarMediaReal() {
      // Usando 'atividades' em vez do termo legado para prevenir falhas futuras
      const { data } = await supabase.from('avaliacoes').select('participacao, comportamento, atividades, socioemocional').eq('aluno_id', alunoId);
      if (data && data.length > 0) {
        let somaTotal = 0; let qtdNotas = 0;
        data.forEach(aval => {
          const notas = [aval.participacao, aval.comportamento, aval.atividades, aval.socioemocional].filter(n => n > 0);
          if (notas.length > 0) {
            somaTotal += notas.reduce((a, b) => a + b, 0) / notas.length;
            qtdNotas++;
          }
        });
        if (qtdNotas > 0) setMediaReal(somaTotal / qtdNotas);
      }
    }
    if (alunoId) buscarMediaReal();
  }, [alunoId]);

  const contatos = [
    { nome: aluno.responsavel, whats: aluno.whatsapp, email: aluno.email_responsavel, cpf: aluno.responsavel_cpf || aluno.cpf_responsavel, profissao: aluno.profissao_responsavel || aluno.responsavel_profissao, tag: aluno.parentesco1 || aluno.parentesco_1 || "Responsável 1", cor: "text-pink-700", bg: "bg-pink-100 border-pink-200" },
    { nome: aluno.responsavel2 || aluno.responsavel_2_nome, whats: aluno.whatsapp2 || aluno.responsavel_2_contato, email: aluno.email_responsavel_2 || aluno.email_responsavel2, cpf: aluno.cpf_responsavel2 || aluno.cpf_responsavel_2, profissao: aluno.profissao_responsavel2 || aluno.responsavel_2_profissao, tag: aluno.parentesco2 || aluno.parentesco_2 || "Responsável 2", cor: "text-blue-700", bg: "bg-blue-100 border-blue-200" },
    { nome: aluno.responsavel3 || aluno.responsavel_3_nome, whats: aluno.whatsapp3 || aluno.responsavel_3_contato, email: aluno.email_responsavel_3 || aluno.email_responsavel3, cpf: aluno.cpf_responsavel_3, profissao: aluno.profissao_responsavel3, tag: aluno.parentesco3 || aluno.parentesco_3 || "Responsável 3", cor: "text-emerald-700", bg: "bg-emerald-100 border-emerald-200" }
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 animate-in slide-in-from-bottom-4 duration-300">
      
      {modalObsAberto && <ModalObservacoesDiario alunoId={alunoId} mediaCalculada={mediaReal} onClose={() => setModalObsAberto(false)} />}

      <div className="xl:col-span-12 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
        <div onClick={() => { if(saldoCreditoVisivel > 0) setVerCreditoGlobal(true); }} className={`p-4 rounded-3xl border transition-all ${saldoCreditoVisivel > 0 ? 'bg-emerald-50 border-emerald-200 cursor-pointer hover:shadow-md hover:-translate-y-1' : 'bg-white border-slate-100 opacity-60'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${saldoCreditoVisivel > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>Crédito Conta</span>
          <p className={`text-xl lg:text-2xl font-black ${saldoCreditoVisivel > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>{saldoCreditoVisivel > 0 ? `R$ ${saldoCreditoVisivel.toFixed(2)}` : 'R$ 0,00'}</p>
        </div>
        
        <div onClick={() => { if(totalPendenteGeral > 0) setVerDividasGlobais(true); }} className={`p-4 rounded-3xl border transition-all ${totalPendenteGeral > 0 ? 'bg-rose-50 border-rose-200 cursor-pointer hover:shadow-md hover:-translate-y-1' : 'bg-white border-slate-100 opacity-60'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${totalPendenteGeral > 0 ? 'text-rose-600' : 'text-slate-400'}`}>Dívida Ativa</span>
          <p className={`text-xl lg:text-2xl font-black ${totalPendenteGeral > 0 ? 'text-rose-700' : 'text-slate-700'}`}>{totalPendenteGeral > 0 ? `R$ ${totalPendenteGeral.toFixed(2)}` : 'R$ 0,00'}</p>
        </div>
        
        <div onClick={() => setModalObsAberto(true)} className="p-4 rounded-3xl border border-amber-200 bg-amber-50 cursor-pointer hover:shadow-md hover:border-amber-300 hover:-translate-y-1 transition-all relative overflow-hidden group">
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">Média Pedagógica</span>
          <p className="text-lg lg:text-xl drop-shadow-sm">{mediaReal > 0 ? "⭐".repeat(Math.round(mediaReal)) : <span className="text-amber-800/40 text-sm font-bold">Sem Notas</span>}</p>
          
          <div className="absolute top-4 right-4 w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>

        <div className="p-4 rounded-3xl border border-sky-100 bg-sky-50">
          <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block mb-1">Frequência Anual</span>
          <p className="text-xl lg:text-2xl font-black text-sky-700">{percentualPresenca.toFixed(0)}%</p>
        </div>
        
        <div className="col-span-2 md:col-span-4 xl:col-span-1 p-4 rounded-3xl border border-indigo-100 bg-indigo-50 flex flex-col justify-center">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">Mensalidade Padrão</span>
          <p className="text-xl lg:text-2xl font-black text-indigo-700 leading-none">{aluno.valor ? parseFloat(aluno.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</p>
          <span className="text-[10px] font-bold text-indigo-400 mt-1 block">Vence dia {aluno.vencimento || '--'}</span>
        </div>
      </div>

      <div className="xl:col-span-8 space-y-6">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-lg">📝</span> Ficha Cadastral
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nascimento</span>
              <p className="text-lg font-bold text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-200">{aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Não registrado'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF do Aluno</span>
              <p className="text-lg font-bold text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-200">{mCPF(aluno.cpf_aluno) || 'Não registrado'}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço Residencial</span>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-lg font-bold text-slate-800">{aluno.endereco ? `${aluno.endereco}, ${aluno.numero || 'S/N'}` : 'Endereço não cadastrado'}</p>
                <p className="text-sm font-semibold text-slate-500 mt-1">{aluno.bairro ? `${aluno.bairro} • ${aluno.cidade}-${aluno.estado}` : ''} {aluno.cep ? ` • CEP: ${aluno.cep}` : ''}</p>
              </div>
            </div>
          </div>
        </div>

        {(aluno.observacoes || aluno.tem_alergia) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aluno.observacoes && (
              <div className="bg-white p-6 rounded-[2rem] border border-blue-200 shadow-sm relative overflow-hidden md:col-span-1">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-3">Anotações Pedagógicas</span>
                <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">{aluno.observacoes}</p>
              </div>
            )}
            {aluno.tem_alergia && (
              <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-200 shadow-sm relative overflow-hidden md:col-span-1">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block mb-3 flex items-center gap-2">⚠️ Alerta Médico / Alergia</span>
                <p className="text-sm font-bold text-rose-800 leading-relaxed">{aluno.alergia_descricao}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3">
          <button onClick={() => router.push(`/admin/alunos/${alunoId}/documentos`)} className="group relative overflow-hidden bg-white border border-emerald-200 hover:border-emerald-400 p-6 rounded-[2rem] shadow-sm transition-all flex flex-col items-center justify-center gap-3">
            <span className="text-3xl group-hover:scale-110 transition-transform">📂</span>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest text-center">Documentos Aluno</span>
          </button>
          <button onClick={() => setVerBoletim(true)} className="group relative overflow-hidden bg-white border border-amber-200 hover:border-amber-400 p-6 rounded-[2rem] shadow-sm transition-all flex flex-col items-center justify-center gap-3">
            <span className="text-3xl group-hover:scale-110 transition-transform">🎓</span>
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest text-center">Boletim</span>
          </button>
          <button onClick={() => setVerHistorico(true)} className="group relative overflow-hidden bg-white border border-indigo-200 hover:border-indigo-400 p-6 rounded-[2rem] shadow-sm transition-all flex flex-col items-center justify-center gap-3">
            <span className="text-3xl group-hover:scale-110 transition-transform">💳</span>
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest text-center">Extrato</span>
          </button>
          <button onClick={() => setVerRelatorios(true)} className="group relative overflow-hidden bg-white border border-fuchsia-200 hover:border-fuchsia-400 p-6 rounded-[2rem] shadow-sm transition-all flex flex-col items-center justify-center gap-3">
            <span className="text-3xl group-hover:scale-110 transition-transform">🧠</span>
            <span className="text-[10px] font-black text-fuchsia-700 uppercase tracking-widest text-center">Relatórios Prof.</span>
          </button>
        </div>
      </div>

      <div className="xl:col-span-4">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm h-full">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-lg">📞</span> Responsáveis
          </h3>
          <div className="space-y-4">
            {contatos.map((contato, index) => contato.nome && (
              <div key={index} className={`p-5 rounded-2xl border ${contato.bg} relative overflow-hidden group`}>
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="pr-12">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md mb-3 inline-block bg-white ${contato.cor} shadow-sm border border-slate-100/50`}>{contato.tag}</span>
                    <p className="text-lg font-bold text-slate-900 leading-tight mb-1">{contato.nome}</p>
                    {contato.profissao && <span className="text-sm font-semibold text-slate-500 block">💼 {contato.profissao}</span>}
                    {contato.email && <span className="text-sm font-semibold text-slate-500 block break-all">📧 {contato.email}</span>}
                  </div>
                  {contato.whats && (
                    <button onClick={() => abrirWhatsApp(contato.whats)} className="absolute top-0 right-0 w-11 h-11 bg-emerald-500 rounded-xl shadow-sm border border-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:scale-105 transition-all text-white" title="Chamar no WhatsApp">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" className="w-6 h-6"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157.1zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
                    </button>
                  )}
                </div>
                <div className="space-y-2 relative z-10 border-t border-slate-200/50 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500 w-12">WPP:</span>
                    <span className="text-base font-bold text-slate-700">{mWhatsApp(contato.whats) || '---'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500 w-12">CPF:</span>
                    <span className="text-base font-bold text-slate-700">{mCPF(contato.cpf) || '---'}</span>
                  </div>
                </div>
              </div>
            ))}
            {contatos.every(c => !c.nome) && (
                <div className="p-8 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-slate-100 border-dashed">Nenhum responsável cadastrado.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RelatoriosAluno({ alunoId, setVerRelatorios }: { alunoId: string, setVerRelatorios: (v: boolean) => void }) {
  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscarRelatorios() {
      const { data, error } = await supabase
        .from('avancos_dificuldades')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('ano', { ascending: false })
        .order('semestre', { ascending: false });

      if (data) setRelatorios(data);
      if (error) console.error("Erro ao buscar relatórios:", error);
      setCarregando(false);
    }
    buscarRelatorios();
  }, [alunoId]);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-fuchsia-600 tracking-tight flex items-center gap-2">
          🧠 Evolução e Dificuldades
        </h3>
        <button onClick={() => setVerRelatorios(false)} className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl transition-colors">← VOLTAR</button>
      </div>

      <div className="bg-fuchsia-50 border border-fuchsia-100 p-4 md:p-6 rounded-2xl mb-6 shadow-sm flex items-center gap-4">
        <div className="text-3xl">📝</div>
        <div>
          <h4 className="text-sm font-bold text-fuchsia-800">Relatórios do Corpo Docente</h4>
          <p className="text-xs text-fuchsia-600/80 mt-1 font-semibold leading-relaxed">
            Acompanhamento qualitativo preenchido pelos professores em diário de classe.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {carregando ? (
          <div className="p-10 text-center text-slate-400 font-bold bg-slate-50 rounded-3xl border border-slate-100 animate-pulse">Buscando pareceres pedagógicos...</div>
        ) : relatorios.length > 0 ? (
          relatorios.map((rel, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Período Referência</span>
                  <span className="font-bold text-slate-800">{rel.semestre} de {rel.ano}</span>
                </div>
                <div className="text-left md:text-right">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Professor(a) Responsável</span>
                   <span className="font-bold text-slate-600">{rel.professor_nome || "Não identificado"}</span>
                </div>
              </div>
              
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="flex items-center gap-2 text-emerald-600 font-bold text-sm mb-3 uppercase tracking-wider">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs">🚀</span>
                    Avanços Obtidos
                  </h5>
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[100px]">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{rel.avancos && rel.avancos !== 'EMPTY' ? rel.avancos : <span className="italic text-slate-400">Nenhum avanço registrado neste período.</span>}</p>
                  </div>
                </div>

                <div>
                  <h5 className="flex items-center gap-2 text-rose-600 font-bold text-sm mb-3 uppercase tracking-wider">
                    <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-xs">⚠️</span>
                    Dificuldades Apresentadas
                  </h5>
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[100px]">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{rel.dificuldades && rel.dificuldades !== 'EMPTY' ? rel.dificuldades : <span className="italic text-slate-400">Nenhuma dificuldade registrada neste período.</span>}</p>
                  </div>
                </div>
              </div>
              
              {rel.data_atualizacao && (
                <div className="px-5 py-2 bg-slate-50/50 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase text-right tracking-widest">
                  Última atualização: {new Date(rel.data_atualizacao).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-slate-400 font-bold bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
            Nenhum relatório qualitativo foi lançado para este aluno até o momento.
          </div>
        )}
      </div>
    </div>
  );
}

export function DividasAluno({ totalPendenteGeral, listaPendenciasGerais, setVerDividasGlobais, ehVisitante, onAbrirPDV, idRenegociacao, setIdRenegociacao, formRenegociacao, setFormRenegociacao, confirmarRenegociacao, isProcessandoAcao }: any) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-rose-600 tracking-tight">⚠️ Detalhamento da Dívida</h3>
        <button onClick={() => { setVerDividasGlobais(false); setIdRenegociacao(null); }} className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl transition-colors">← VOLTAR AO PERFIL</button>
      </div>

      <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl mb-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <span className="text-xs text-rose-600 font-bold uppercase tracking-widest">Valor Total em Aberto</span>
          <p className="text-3xl font-black text-rose-700 mt-1">R$ {totalPendenteGeral.toFixed(2)}</p>
        </div>
        {!ehVisitante && (
          <button onClick={() => onAbrirPDV && onAbrirPDV(null)} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
            RECEBER MÚLTIPLAS DÍVIDAS
          </button>
        )}
      </div>

      <div className="space-y-4">
        {listaPendenciasGerais.length > 0 ? listaPendenciasGerais.map((pend: any, i: number) => {
          const valorTotal = clean(pend.valor_total);
          const valorPago = clean(pend.valor_pago);
          const restante = valorTotal - valorPago;
          const renegociandoEste = idRenegociacao === pend.id;

          return (
            <div 
              key={i} 
              onClick={(e) => { 
                if (!renegociandoEste && onAbrirPDV && (e.target as HTMLElement).tagName !== 'BUTTON' && (e.target as HTMLElement).tagName !== 'INPUT') {
                  onAbrirPDV(pend.id); 
                }
              }} 
              className={`p-5 rounded-2xl border transition-all ${renegociandoEste ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md cursor-pointer'}`}
              title={!renegociandoEste ? "Clique para pagar esta fatura" : ""}
            >
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <span className="text-base font-bold text-slate-800">{pend.descricao}</span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs font-semibold text-slate-500">Vencimento/Base: {new Date(pend.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${pend.atraso_automatico ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {pend.atraso_automatico ? 'NÃO PAGO (ATRASO)' : pend.status}
                    </span>
                  </div>
                </div>
                <div className="text-left md:text-right flex flex-col items-end gap-2">
                  <span className="text-lg font-black text-rose-600 block">R$ {restante.toFixed(2)}</span>
                  
                  {!renegociandoEste && (
                     <div className="flex gap-2">
                        {onAbrirPDV && (
                           <button onClick={(e) => { e.stopPropagation(); onAbrirPDV(pend.id); }} className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors uppercase flex items-center gap-1" title="Pagar Dívida">
                              💵 Quitar Fatura
                           </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setIdRenegociacao(pend.id); }} className="bg-white border border-amber-500 text-amber-600 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-1">
                            🔄 Dividir / Acordo
                        </button>
                     </div>
                  )}
                </div>
              </div>

              {renegociandoEste && (
                <div className="mt-5 pt-5 border-t border-amber-200 border-dashed flex flex-col sm:flex-row gap-4 items-end animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-black text-amber-800 mb-1 block uppercase">Número de Parcelas</label>
                    <input type="number" value={formRenegociacao.parcelas} onChange={(e) => setFormRenegociacao({...formRenegociacao, parcelas: e.target.value})} className="w-full p-2.5 rounded-xl border border-amber-300 outline-none text-sm font-bold text-slate-700" />
                  </div>
                  <div className="flex-[2] w-full">
                    <label className="text-[10px] font-black text-amber-800 mb-1 block uppercase">Data do 1º Vencimento</label>
                    <input type="date" value={formRenegociacao.vencimentoInicial} onChange={(e) => setFormRenegociacao({...formRenegociacao, vencimentoInicial: e.target.value})} className="w-full p-2.5 rounded-xl border border-amber-300 outline-none text-sm font-bold text-slate-700" />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setIdRenegociacao(null)} className="flex-1 sm:flex-none p-3 rounded-xl border border-slate-300 bg-white text-slate-500 font-bold hover:bg-slate-50">CANCELAR</button>
                    <button onClick={() => confirmarRenegociacao(pend)} disabled={isProcessandoAcao} className="flex-1 sm:flex-none p-3 rounded-xl border-none bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-sm">CONFIRMAR</button>
                  </div>
                </div>
              )}
            </div>
          );
        }) : <div className="p-10 text-center bg-slate-50 rounded-3xl border border-slate-100 text-slate-500 font-bold">Nenhuma pendência financeira encontrada.</div>}
      </div>
    </div>
  );
}

export function CreditoAluno({ historicoLocal, saldoCreditoVisivel, setVerCreditoGlobal, editandoCredito, setEditandoCredito, novoValorCredito, setNovoValorCredito, handleSalvarCredito, handleZerarCredito, isProcessandoAcao, ehVisitante, processarAcaoPagamento, userEmail }: any) {
  const historicoCreditos = historicoLocal.filter((h: any) => 
    h.tipo?.toLowerCase() === 'credito' || 
    h.descricao?.toLowerCase().includes('crédito') || 
    h.descricao?.toLowerCase().includes('troco') ||
    h.descricao?.toLowerCase().includes('adiantamento')
  );

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-emerald-600 tracking-tight">💰 Carteira de Crédito</h3>
        <button onClick={() => setVerCreditoGlobal(false)} className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl transition-colors">← VOLTAR AO PERFIL</button>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl mb-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left w-full md:w-auto">
          <span className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Saldo Atual Retido</span>
          {editandoCredito ? (
            <div className="flex items-center gap-2 mt-2">
              <input type="number" value={novoValorCredito} onChange={(e) => setNovoValorCredito(e.target.value)} placeholder="0.00" className="px-3 py-1.5 rounded-xl border border-emerald-300 text-lg font-bold text-center w-32 outline-none" />
              <button onClick={handleSalvarCredito} disabled={isProcessandoAcao} className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-emerald-700">✓</button>
              <button onClick={() => setEditandoCredito(false)} className="bg-white border border-slate-200 text-slate-500 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-slate-50">X</button>
            </div>
          ) : (
            <p className="text-3xl font-black text-emerald-700 mt-1">R$ {saldoCreditoVisivel.toFixed(2)}</p>
          )}
        </div>
        {!ehVisitante && !editandoCredito && (
          <div className="flex gap-2 w-full md:w-auto justify-center md:justify-end">
            <button onClick={() => { setNovoValorCredito(saldoCreditoVisivel.toString()); setEditandoCredito(true); }} className="bg-white border border-emerald-300 text-emerald-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-colors flex items-center gap-1">
              ✏️ Ajustar
            </button>
            <button onClick={handleZerarCredito} disabled={isProcessandoAcao} className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors flex items-center gap-1">
              🗑️ Zerar
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3 mt-6">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Histórico de Movimentações de Crédito</h4>
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
          {historicoCreditos.length > 0 ? (
            historicoCreditos.map((h: any, idx: number) => {
              const forma = h.detalhes_metodos?.forma_geradora || extrairFormaPagamento(h.detalhes_metodos) || 'Não especificada';
              const isSubtracao = h.detalhes_metodos?.e_subtracao === true;
              const valorRenderizado = Math.abs(clean(h.valor_total));
              const podeGerenciar = !ehVisitante;

              return (
                <div key={idx} className="flex flex-col md:flex-row justify-between md:items-center p-4 hover:bg-slate-50/50 transition-colors gap-4">
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">{h.descricao}</span>
                    <span className="text-xs text-slate-500 mt-1 block">
                      🗓️ Data: {new Date(h.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} 
                      {forma && <span className="ml-2 font-bold text-slate-500">| 💳 Forma: {forma}</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 justify-between w-full md:w-auto">
                    <span className={`text-base font-black ${isSubtracao ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isSubtracao ? '- ' : '+ '}R$ {valorRenderizado.toFixed(2)}
                    </span>
                    {podeGerenciar && (
                      <div className="flex gap-2 pl-4 border-l border-slate-200">
                        {/* Como solicitou, a opção excluir também foi removida daqui, ficando só para edição manual se precisar, 
                            mas o estorno automático já deleta esse registro fantasma na função principal. */}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-400 italic font-medium">Nenhum registro de movimentação de crédito encontrado.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BoletimAluno({ aluno, anoSelecionado, setAnoSelecionado, notas, setVerBoletim }: any) {
  function gerarPDFBoletim() {
    const doc = new jsPDF();
    const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
    const carimboEscolaUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Escola.png";
    const carimboSuellenUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Suellen.png";

    try {
      doc.saveGraphicsState();
      const gState = new (doc as any).GState({ opacity: 0.05 });
      doc.setGState(gState);
      doc.addImage(logoUrl, "PNG", 30, 80, 150, 150, undefined, 'FAST'); 
      doc.restoreGraphicsState();
    } catch (e) {}
    try { doc.addImage(logoUrl, "PNG", 20, 10, 35, 35); } catch (e) {}

    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("ESCOLA ABC DO PARK", 60, 20);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text("CNPJ 05.067.797/0001-68", 60, 26);
    doc.text("CONJ PARKLANDIA - QUADRA A CASA 02", 60, 31);
    doc.text("TELEFONE (91) 3268-3484 / (91) 98622-7715", 60, 36);
    doc.text("INEP - 15159213", 60, 41);
    doc.line(20, 50, 190, 50);

    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text(`BOLETIM ESCOLAR OFICIAL - ${anoSelecionado}`, 105, 65, { align: "center" });

    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("DADOS DO ALUNO(A):", 20, 75);
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${aluno?.nome?.toUpperCase()}`, 20, 82);
    doc.text(`Turma: ${aluno?.turma}`, 20, 87);
    doc.text(`Responsável: ${aluno?.responsavel?.toUpperCase() || "NÃO INFORMADO"}`, 20, 92);
    doc.text(`Nascimento: ${aluno?.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : "--"} (${calcularIdade(aluno?.data_nascimento)})`, 20, 97);

    autoTable(doc, {
      startY: 105,
      head: [['DISCIPLINA', '1ºB', '2ºB', 'R1', '3ºB', '4ºB', 'R2', 'MÉD']],
      body: notas.map((n: any) => [
        n.disciplina.toUpperCase(),
        n.bimestre1 ?? '-', n.bimestre2 ?? '-', n.recuperacao1 ?? '-',
        n.bimestre3 ?? '-', n.bimestre4 ?? '-', n.recuperacao2 ?? '-',
        n.media || '0.0'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 8, halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 0) {
          const valorNota = parseFloat(data.cell.raw as string);
          if (!isNaN(valorNota) && valorNota < 7) data.cell.styles.textColor = [220, 38, 38]; 
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Belém, ${hoje}.`, 20, finalY);
    try { doc.addImage(carimboEscolaUrl, "PNG", 120, finalY - 15, 75, 75); } catch (e) {}
    doc.setFont("helvetica", "bold"); doc.text("Atenciosamente,", 20, finalY + 25);
    try { doc.addImage(carimboSuellenUrl, "PNG", 83, finalY + 27, 45, 28); } catch (e) {}
    doc.text("_________________________________", 105, finalY + 55, { align: "center" });
    doc.setFontSize(9); doc.text("Suellen C. S. Figueiredo", 105, finalY + 61, { align: "center" });
    doc.setFontSize(8); doc.text("DIRETORA / REG. 6235", 105, finalY + 67, { align: "center" });
    doc.save(`Boletim_${aluno?.nome?.replace(/\s+/g, '_')}_${anoSelecionado}.pdf`);
  }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Boletim Escolar</h3>
          <select value={anoSelecionado} onChange={(e) => setAnoSelecionado(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none text-slate-700 focus:border-indigo-400">
            <option value="2026">Letivo 2026</option>
            <option value="2025">Letivo 2025</option>
            <option value="2024">Letivo 2024</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={gerarPDFBoletim} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm">📄 IMPRIMIR PDF</button>
          <button onClick={() => setVerBoletim(false)} className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors">← VOLTAR</button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-200">
              <th className="p-4">Disciplina Escolar</th>
              <th className="p-4 text-center">1ºB</th>
              <th className="p-4 text-center">2ºB</th>
              <th className="p-4 text-center text-rose-500">R1</th>
              <th className="p-4 text-center">3ºB</th>
              <th className="p-4 text-center">4ºB</th>
              <th className="p-4 text-center text-rose-500">R2</th>
              <th className="p-4 text-center text-indigo-600">MÉDIA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {notas.length > 0 ? notas.map((n: any) => {
              const media = obterMediaFinal(n);
              return (
                <tr key={n.id} className="hover:bg-slate-50/50 transition-colors bg-white">
                  <td className="p-4 font-bold text-slate-800 text-sm">{n.disciplina}</td>
                  {['bimestre1', 'bimestre2', 'recuperacao1', 'bimestre3', 'bimestre4', 'recuperacao2'].map((b) => (
                    <td key={b} className="p-2 text-center">
                      <input type="text" defaultValue={n[b] || ""} disabled={true} className={`w-12 text-center p-2 rounded-lg border border-slate-200 outline-none font-bold text-sm ${b.includes('recuperacao') ? 'bg-rose-50 border-rose-100' : 'bg-slate-50'} ${parseFloat(n[b]) < 7 ? 'text-rose-600' : 'text-slate-700'}`} />
                    </td>
                  ))}
                  <td className={`p-4 text-center font-black text-base ${parseFloat(media) < 7 ? 'text-rose-600' : 'text-indigo-600'}`}>{media}</td>
                </tr>
              );
            }) : (
              <tr><td colSpan={8} className="p-10 text-center text-slate-400 font-bold bg-slate-50">Nenhum registro acadêmico encontrado para {anoSelecionado}.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExtratoAluno({ aluno, historicoLocal, anoPagamentoSelecionado, setAnoPagamentoSelecionado, setVerHistorico, ehVisitante, isProcessandoAcao, handleEditarPagamento, userEmail, SENHA_MESTRA, onAbrirPDV, onRecarregar }: any) {
  
  const historicoFiltradoExibicao = (historicoLocal || []).filter((h: any) => {
    if (h.tipo?.toLowerCase() === 'credito') return false;
    if (anoPagamentoSelecionado === 'todos') return true;

    const strData = h.data_pagamento ? String(h.data_pagamento) : "";
    const strDesc = h.descricao ? String(h.descricao) : "";
    const strVenc = h.data_vencimento ? String(h.data_vencimento) : "";
    const strCreated = h.created_at ? String(h.created_at) : "";

    return strData.includes(anoPagamentoSelecionado) ||
           strDesc.includes(anoPagamentoSelecionado) ||
           strVenc.includes(anoPagamentoSelecionado) ||
           strCreated.includes(anoPagamentoSelecionado);
  });

  const higienizarFormaPagamento = (detalhes: any, stringLegado?: string | null) => {
    let limpa = String(stringLegado || "").toUpperCase().trim();
    if (limpa === 'UNDEFINED' || limpa === 'NULL') limpa = '';
    
    if (limpa.includes("PIX") || limpa.includes("DINHEIRO") || limpa.includes("BOLETO") || limpa.includes("DÉBITO")) {
        if (!limpa.includes("CRÉDITO") && !limpa.includes("CARTÃO")) {
            limpa = limpa.replace(/\s*\+?\s*PARCELAS?/gi, '').trim();
            if (limpa.endsWith('+')) limpa = limpa.slice(0, -1).trim();
        }
    }
    
    if (limpa && limpa !== 'INDEFINIDA' && limpa !== 'NÃO REGISTRADA') {
        return limpa;
    }

    if (detalhes) {
        const permitidos = ['pix', 'pix_editora', 'dinheiro', 'credito', 'credito_editora', 'debito', 'debito_editora', 'boleto', 'credito_aluno'];
        const metodosReais = Object.keys(detalhes).filter(key => permitidos.includes(key) && clean(detalhes[key]) > 0);
        
        if (metodosReais.length > 0) {
            let resultadoFinal = metodosReais.map(m => {
                if (m === 'pix' || m === 'pix_editora') return 'PIX';
                if (m === 'dinheiro') return 'DINHEIRO';
                if (m === 'credito' || m === 'credito_editora') {
                    const parc = parseInt(detalhes.parcelas) || 1;
                    return parc > 1 ? `CARTÃO DE CRÉDITO ${parc}X` : 'CARTÃO DE CRÉDITO';
                }
                if (m === 'debito' || m === 'debito_editora') return 'CARTÃO DE DÉBITO';
                if (m === 'boleto') return 'BOLETO';
                if (m === 'credito_aluno') return 'SALDO VIRTUAL';
                return '';
            }).filter(Boolean).join(' + ');

            resultadoFinal = Array.from(new Set(resultadoFinal.split(' + '))).join(' + ');
            return resultadoFinal;
        }
    }

    return "Baixa Manual / Legado";
  };

  // ESTORNO CIRÚRGICO SIMPLIFICADO C/ REVERSÃO AUTOMÁTICA DE SALDO/TROCO
  const estornoCirurgico = async (pgto: any) => {
    if (prompt("⚠️ ATENÇÃO: Esta ação fará com que o recebimento seja totalmente estornado.\nA dívida voltará a ficar 'pendente' e saldos gerados serão reajustados.\n\nDigite a Senha Mestra para confirmar:") !== (SENHA_MESTRA || "1234")) {
      return alert("Senha incorreta.");
    }

    try {
      // 1. Busca os dados reais e profundos deste pagamento no banco
      const { data: registroReal, error: fetchError } = await supabase
        .from('historico_pagamentos')
        .select('*')
        .eq('id', pgto.id)
        .single();

      if (fetchError || !registroReal) return alert("Erro ao localizar registro na base de dados.");

      let detalhesObj = registroReal.detalhes_metodos;
      if (typeof detalhesObj === 'string') {
        try { detalhesObj = JSON.parse(detalhesObj); } catch (e) { detalhesObj = {}; }
      }

      // 2. Localiza o saldo atual da carteira virtual do aluno
      const { data: dadosAluno } = await supabase
        .from('alunos')
        .select('saldo_credito')
        .eq('id', registroReal.aluno_id)
        .single();
      
      let saldoAtualizado = clean(dadosAluno?.saldo_credito);

      // CASO A: A venda utilizou Saldo Virtual do aluno -> Devolve o saldo para ele
      const saldoUtilizadoNaEpoca = detalhesObj?.credito_aluno ? clean(detalhesObj.credito_aluno) : 0;
      if (saldoUtilizadoNaEpoca > 0) {
          saldoAtualizado += saldoUtilizadoNaEpoca;
      }

      // CASO B: A venda gerou Crédito de Troco na época -> Remove o troco gerado do saldo dele
      const { data: creditosVinculados } = await supabase
          .from('historico_pagamentos')
          .select('id, valor_total, detalhes_metodos')
          .eq('aluno_id', registroReal.aluno_id)
          .eq('tipo', 'credito');

      if (creditosVinculados && creditosVinculados.length > 0) {
          for (const cred of creditosVinculados) {
              let credDet = cred.detalhes_metodos;
              if (typeof credDet === 'string') {
                  try { credDet = JSON.parse(credDet); } catch(e) { credDet = {}; }
              }
              // Localiza o crédito de troco que nasceu a partir desta transação específica
              const origens = credDet?.ids_origem || [];
              if (Array.isArray(origens) && origens.map(String).includes(String(registroReal.id))) {
                  saldoAtualizado -= clean(cred.valor_total);
                  // Apaga fisicamente a linha de crédito para limpar o extrato
                  await supabase.from('historico_pagamentos').delete().eq('id', cred.id);
              }
          }
      }

      // 3. Salva a correção final do saldo na ficha do aluno
      await supabase.from('alunos').update({ saldo_credito: Math.max(0, saldoAtualizado) }).eq('id', registroReal.aluno_id);

      // 4. Retorna o faturamento original para o estado aberto/pendente
      const { error } = await supabase.from('historico_pagamentos').update({
        status: 'pendente',
        valor_pago: 0,
        detalhes_metodos: null
      }).eq('id', pgto.id);

      if (error) throw error;

      alert("Estorno processado com sucesso! Saldos corrigidos e dívida reaberta.");
      if (onRecarregar) onRecarregar();
    } catch (error: any) {
      alert("Erro operacional ao estornar: " + error.message);
    }
  };

  function gerarPDFHistorico() {
    const doc = new jsPDF();
    const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
    const carimboEscolaUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Escola.png";
    const carimboSuellenUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Suellen.png";

    try {
      doc.saveGraphicsState();
      const gState = new (doc as any).GState({ opacity: 0.05 });
      doc.setGState(gState);
      doc.addImage(logoUrl, "PNG", 30, 80, 150, 150, undefined, 'FAST'); 
      doc.restoreGraphicsState();
    } catch (e) {}
    try { doc.addImage(logoUrl, "PNG", 20, 10, 30, 30); } catch (e) {}

    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("ESCOLA ABC DO PARK", 52, 20);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text("CNPJ 05.067.797/0001-68", 52, 25);
    doc.text("CONJ PARKLANDIA - QUADRA A CASA 02", 52, 29);
    doc.text("TELEFONE (91) 3268-3484 / (91) 98622-7715", 52, 33);
    doc.text("INEP - 15159213", 52, 37);
    doc.line(20, 50, 190, 50);
    doc.line(20, 50, 190, 50);
    doc.setFontSize(12); doc.text("EXTRATO FINANCEIRO DETALHADO - ESCOLA ABC DO PARK", 105, 57, { align: "center" });
    doc.setFontSize(10); doc.text(`Aluno: ${aluno?.nome?.toUpperCase()}`, 15, 65);
    
    const linhasTabela: any[] = [];
    
    historicoFiltradoExibicao.forEach((h: any) => {
      let f = null;
      if (clean(h.valor_pago) > 0) {
          f = h.detalhes_metodos?.formas || h.detalhes_metodos?.forma_geradora;
          if (!f && h.detalhes_metodos?.historico_parciais?.length > 0) {
            const formasVistas = new Set(h.detalhes_metodos.historico_parciais.map((p:any) => higienizarFormaPagamento(null, p.formas)));
            f = Array.from(formasVistas).join(' + ');
          } else {
            f = higienizarFormaPagamento(h.detalhes_metodos, f);
          }
      }
      
      linhasTabela.push([
        new Date(h.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}),
        h.descricao.toUpperCase(),
        f || "-",
        `R$ ${clean(h.valor_total).toFixed(2)}`,
        `R$ ${clean(h.valor_pago).toFixed(2)}`
      ]);

      const parciais = h.detalhes_metodos?.historico_parciais || [];
      const mostrarSubTabela = parciais.length > 1; 

      if (mostrarSubTabela) {
        parciais.forEach((parcial: any) => {
          linhasTabela.push([
            new Date(parcial.data_recebimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}),
            `   ↳ Pagamento Parcial Aplicado`,
            higienizarFormaPagamento(null, parcial.formas) || "-",
            "-",
            `R$ ${clean(parcial.valor_pago_rodada).toFixed(2)}`
          ]);
        });
      }
    });

    autoTable(doc, {
      startY: 70,
      head: [['DATA', 'DESCRIÇÃO', 'FORMA DE PAGAMENTO', 'VALOR TOTAL', 'VALOR PAGO']],
      body: linhasTabela,
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 
        0: { cellWidth: 20 }, 
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] } 
      },
      didParseCell: function (data: any) {
        const rawRow = data.row.raw as any[];
        if (rawRow && rawRow[1] && String(rawRow[1]).includes('↳')) {
          data.cell.styles.fillColor = [248, 250, 252];
          data.cell.styles.textColor = [100, 116, 139];
          data.cell.styles.fontStyle = 'italic';
        }
      }
    });

    doc.save(`Extrato_${aluno?.nome?.replace(/\s+/g, '_')}_${anoPagamentoSelecionado}.pdf`);
  }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Extrato Financeiro</h3>
          
          <select value={anoPagamentoSelecionado} onChange={(e) => setAnoPagamentoSelecionado(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none text-slate-700 focus:border-indigo-400">
            <option value="todos">Mostrar Todos</option>
            <option value="2026">Ano Base 2026</option>
            <option value="2025">Ano Base 2025</option>
            <option value="2024">Ano Base 2024</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={gerarPDFHistorico} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm">📄 EXPORTAR EXTRATO</button>
          <button onClick={() => setVerHistorico(false)} className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors">← VOLTAR</button>
        </div>
      </div>

      <div className="space-y-4">
        {historicoFiltradoExibicao.length > 0 ? historicoFiltradoExibicao.map((pgto: any, i: number) => {
          
          let formaPrincipal = null;
          if (clean(pgto.valor_pago) > 0) {
              formaPrincipal = pgto.detalhes_metodos?.formas || pgto.detalhes_metodos?.forma_geradora;
              if (!formaPrincipal && pgto.detalhes_metodos?.historico_parciais?.length > 0) {
                  const formasVistas = new Set(pgto.detalhes_metodos.historico_parciais.map((p:any) => higienizarFormaPagamento(null, p.formas)));
                  formaPrincipal = Array.from(formasVistas).join(' + ');
              } else {
                  formaPrincipal = higienizarFormaPagamento(pgto.detalhes_metodos, formaPrincipal);
              }
          }

          const parciais = pgto.detalhes_metodos?.historico_parciais || [];
          
          let totalDescontoAplicado = clean(pgto.detalhes_metodos?.desconto);
          parciais.forEach((p:any) => totalDescontoAplicado += clean(p.desconto));

          let devedorRestante = clean(pgto.valor_total) - clean(pgto.valor_pago) - totalDescontoAplicado;
          if (devedorRestante < 0.01) devedorRestante = 0; 

          const isVisualmentePago = pgto.status === 'pago' || devedorRestante === 0;
          const podeGerenciar = userEmail === 'carlamonaliza9@gmail.com';
          
          const mostrarHistoricoParcial = parciais.length > 1;
          
          return (
            <div 
              key={i} 
              onClick={(e) => { 
                if (devedorRestante > 0 && onAbrirPDV && (e.target as HTMLElement).tagName !== 'BUTTON') {
                  onAbrirPDV(pgto.id); 
                }
              }}
              className={`p-5 rounded-2xl border transition-all ${devedorRestante > 0 && onAbrirPDV ? 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md cursor-pointer' : 'bg-white border-slate-200 shadow-sm'}`}
              title={devedorRestante > 0 ? "Clique para quitar a pendência" : ""}
            >
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1.5">
                  <span className="text-base font-bold text-slate-800">
                    {pgto.descricao}
                    {pgto.status === 'estornado' && <span className="ml-2 text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md uppercase tracking-widest">Estornado</span>}
                    {pgto.status === 'cancelado' && <span className="ml-2 text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-widest">Cancelado</span>}
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">🗓️ {new Date(pgto.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                    {formaPrincipal && <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">💳 {formaPrincipal}</span>}
                  </div>
                </div>
                
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-none border-slate-100 pt-4 md:pt-0 mt-2 md:mt-0">
                  <div className="text-left md:text-right space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Original: R$ {clean(pgto.valor_total).toFixed(2)}</span>
                    <span className={`text-lg font-black block ${isVisualmentePago ? 'text-emerald-600' : 'text-rose-600'}`}>Pago: R$ {clean(pgto.valor_pago).toFixed(2)}</span>
                    {devedorRestante > 0 && <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md inline-block uppercase tracking-wider">Aberto: R$ {devedorRestante.toFixed(2)}</span>}
                  </div>

                  {podeGerenciar && (
                    <div className="flex gap-2 pl-4 border-l border-slate-200 h-full items-center">
                      
                      {devedorRestante > 0 && onAbrirPDV && (
                        <button onClick={(e) => { e.stopPropagation(); onAbrirPDV(pgto.id); }} className="mr-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors uppercase flex items-center gap-1" title="Pagar Dívida">
                          💵 Quitar
                        </button>
                      )}

                      <button onClick={(e) => { e.stopPropagation(); if (prompt("Digite a Senha Mestra para EDITAR:") === SENHA_MESTRA) handleEditarPagamento(pgto); else alert("Senha incorreta."); }} disabled={isProcessandoAcao} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors" title="Editar Valores">✏️</button>
                      
                      <button onClick={(e) => { e.stopPropagation(); estornoCirurgico(pgto); }} disabled={isProcessandoAcao} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 flex items-center justify-center transition-colors" title="Desfazer Lançamento (Estornar)">🔄</button>
                    </div>
                  )}
                </div>
              </div>

              {mostrarHistoricoParcial && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 bg-slate-50/50 p-4 rounded-xl" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Detalhamento Financeiro (Baixas Parciais)</span>
                  {parciais.map((parcial: any, idx: number) => {
                    const formaParcialLimpa = higienizarFormaPagamento(null, parcial.formas) || "Não Registrada";
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center text-xs bg-white p-3 rounded-lg border border-slate-200 shadow-sm gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="font-semibold text-slate-700">Baixa #{idx + 1} em <span className="font-black">{new Date(parcial.data_recebimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span></span>
                          <span className="hidden sm:inline text-slate-300">|</span>
                          <span className="font-semibold text-indigo-600">Forma: {formaParcialLimpa}</span>
                        </div>
                        
                        <div className="flex gap-4 items-center sm:justify-end">
                          {(parseFloat(parcial.desconto) > 0 || parseFloat(parcial.multa) > 0 || parseFloat(parcial.juros_cartao) > 0) && (
                            <div className="flex flex-col text-[9px] font-bold text-slate-400 text-right">
                              {parseFloat(parcial.desconto) > 0 && <span>Desconto: -R$ {parseFloat(parcial.desconto).toFixed(2)}</span>}
                              {parseFloat(parcial.multa) > 0 && <span>Multa/Juros: +R$ {parseFloat(parcial.multa).toFixed(2)}</span>}
                              {parseFloat(parcial.juros_cartao) > 0 && <span>Taxa Maq: +R$ {parseFloat(parcial.juros_cartao).toFixed(2)}</span>}
                            </div>
                          )}
                          <span className="font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            R$ {clean(parcial.valor_pago_rodada).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          );
        }) : <div className="p-10 text-center bg-slate-50 rounded-3xl border border-slate-100 text-slate-500 font-bold">Nenhum extrato referenciado encontrado para o período selecionado.</div>}
      </div>
    </div>
  );
}