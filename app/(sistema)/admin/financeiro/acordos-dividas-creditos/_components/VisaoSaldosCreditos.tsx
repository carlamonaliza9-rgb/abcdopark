"use client";

import { useState, useEffect, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { removerAcentos } from "@/lib/utils"; 

const clean = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};

function extrairMesAnoInteligente(h: any, fallbackAno: string) {
  const desc = (h.descricao || "").toLowerCase();
  let mes = (h.mes_referencia || "").toLowerCase().trim();
  
  const nomesMeses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  
  if (!mes || !nomesMeses.includes(mes)) {
    mes = nomesMeses.find(m => desc.includes(m)) || "";
  }
  
  const anoMatch = desc.match(/(20\d{2})/);
  let ano = anoMatch ? anoMatch[0] : null;
  
  if (!ano && (h.data_vencimento || h.vencimento)) {
      const dVenc = new Date(h.data_vencimento || h.vencimento);
      if (!isNaN(dVenc.getTime())) ano = dVenc.getFullYear().toString();
  }

  if (!ano && h.data_pagamento) {
      const dPgto = new Date(h.data_pagamento);
      if (!isNaN(dPgto.getTime())) {
          const anoPgto = dPgto.getFullYear();
          const mesPgto = dPgto.getMonth();
          
          if (mesPgto >= 9 && ["janeiro", "fevereiro", "março", "abril"].includes(mes)) {
              ano = (anoPgto + 1).toString();
          } else {
              ano = anoPgto.toString();
          }
      }
  }

  return { mes, ano: ano || fallbackAno };
}

export function VisaoSaldosCreditos() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [listaSaldosDevedores, setListaSaldosDevedores] = useState<any[]>([]);
  const [filtroNome, setFiltroNome] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"todos" | "dividas" | "creditos">("todos");
  const [carregando, setCarregando] = useState(true);
  const [alunosExpandidos, setAlunosExpandidos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function carregarDados() {
      setCarregando(true);
      try {
        const { data: listaAlunos } = await supabase.from('alunos').select('*');
        const { data: pgtosPendentes } = await supabase.from('historico_pagamentos').select('*').in('status', ['pendente', 'parcial', 'atrasado']);
        
        // --- NOVA TRAVA: Buscar acordos para remover as dívidas substituídas ---
        const { data: acordosDB } = await supabase.from('historico_pagamentos').select('detalhes_metodos').eq('tipo', 'acordo');
        let idsDuvidasRenegociadas: string[] = [];
        if (acordosDB) {
          acordosDB.forEach(ac => {
             let detalhes = ac.detalhes_metodos;
             if (typeof detalhes === 'string') {
               try { detalhes = JSON.parse(detalhes); } catch(e) { detalhes = {}; }
             }
             if (detalhes?.ids_origem_acordo) {
                idsDuvidasRenegociadas = idsDuvidasRenegociadas.concat(detalhes.ids_origem_acordo);
             }
          });
        }
        // Remove duplicadas
        idsDuvidasRenegociadas = Array.from(new Set(idsDuvidasRenegociadas));

        const ordemHierarquicaTurmas = ["maternal", "jardim i", "jardim 1", "jardim ii", "jardim 2", "1º ano", "2º ano", "3º ano", "4º ano", "5º ano"];
        const obterPesoPedagogico = (turmaNome: string) => {
          const nomeMinusculo = (turmaNome || "").toLowerCase().trim();
          const index = ordemHierarquicaTurmas.findIndex(t => nomeMinusculo.includes(t));
          return index === -1 ? 999 : index;
        };

        if (listaAlunos) {
          const ordenados = [...listaAlunos].sort((a, b) => {
            const pesoA = obterPesoPedagogico(a.turma);
            const pesoB = obterPesoPedagogico(b.turma);
            if (pesoA !== pesoB) return pesoA - pesoB;
            const compTurmaString = (a.turma || "").localeCompare(b.turma || "", "pt-BR");
            if (compTurmaString !== 0) return compTurmaString;
            return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
          });
          setAlunos(ordenados);
        }

        if (pgtosPendentes) {
             const dividasReais = pgtosPendentes.filter(p => {
                 // IGNORA A DÍVIDA SE ELA TIVER SIDO TRANSFORMADA EM ACORDO
                 if (idsDuvidasRenegociadas.includes(String(p.id))) return false;

                 if (p.tipo !== 'mensalidade') return true;
                 const dataVenc = new Date(p.data_vencimento || p.vencimento || p.data_pagamento || new Date());
                 dataVenc.setHours(0,0,0,0);
                 const hoje = new Date();
                 hoje.setHours(0,0,0,0);
                 return hoje > dataVenc;
             });
             setListaSaldosDevedores(dividasReais);
        }
      } catch (err) {
        console.error("Erro ao processar balanço de saldos:", err);
      } finally { setCarregando(false); }
    }
    carregarDados();
  }, []);

  const toggleAluno = (id: string) => setAlunosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));

  function gerarPDFExtratoAluno(alunoAgrupado: any) {
    const doc = new jsPDF();
    const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
    
    try { doc.addImage(logoUrl, "PNG", 15, 12, 22, 22); } catch (e) {}
    
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(30, 41, 59); doc.text("ESCOLA ABC DO PARK", 42, 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 116, 139); 
    doc.text("Educação Infantil e Ensino Fundamental", 42, 23); doc.text("Belém - Pará | Núcleo de Gestão Financeira", 42, 28);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.text("EXTRATO DE CONTA CORRENTE", 195, 18, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 195, 23, { align: "right" });
    doc.setDrawColor(226, 232, 240); doc.line(15, 38, 195, 38);

    const cpfAluno = alunoAgrupado.alunoRaw?.cpf || alunoAgrupado.alunoRaw?.cpf_aluno || "NÃO CADASTRADO";
    const cpfResponsavel = alunoAgrupado.alunoRaw?.cpf_responsavel || alunoAgrupado.alunoRaw?.cpf_resp || "NÃO CADASTRADO";
    const nomeResponsavel = alunoAgrupado.alunoRaw?.responsavel || alunoAgrupado.alunoRaw?.nome_responsavel || "NÃO INFORMADO";

    autoTable(doc, {
      startY: 42,
      body: [
        [ { content: `ALUNO(A):\n${alunoAgrupado.nome.toUpperCase()}`, styles: { fontStyle: 'bold' } }, { content: `CPF DO ALUNO:\n${cpfAluno}`, styles: { fontStyle: 'bold' } }, { content: `TURMA / ETAPA LETIVA:\n${alunoAgrupado.turma.toUpperCase()}`, styles: { fontStyle: 'bold' } } ],
        [ { content: `RESPONSÁVEL FINANCEIRO:\n${nomeResponsavel.toUpperCase()}`, styles: { fontStyle: 'bold' } }, { content: `CPF DO RESPONSÁVEL:\n${cpfResponsavel}`, styles: { fontStyle: 'bold' } }, { content: `SITUAÇÃO DA MATRÍCULA:\nREGULAR`, styles: { fontStyle: 'bold' } } ]
      ],
      theme: 'plain', styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [71, 85, 105], fillColor: [248, 250, 252] }, columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 50 }, 2: { cellWidth: 60 } }
    });

    const tableRows: any[] = [];
    if (alunoAgrupado.credito > 0) tableRows.push(["--", "--", "SALDO CREDOR RETIDO (ADIANTAMENTOS EM CONTA)", "-", "-", `+ R$ ${alunoAgrupado.credito.toFixed(2)}`]);

    alunoAgrupado.dividas.forEach((it: any) => { tableRows.push([ it.dataCriacao, it.dataPagamento, it.descricao.toUpperCase(), `R$ ${it.valorTotal.toFixed(2)}`, `R$ ${it.valorPago.toFixed(2)}`, `R$ ${it.valorRestante.toFixed(2)}` ]); });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6, head: [['DATA Lanç.', 'ÚLT. MOV.', 'HISTÓRICO DO LANÇAMENTO', 'VALOR ORIGINAL', 'VALOR ABATIDO', 'DÉBITO ATUAL']], body: tableRows,
      theme: 'striped', headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold', fontSize: 8.5 }, styles: { fontSize: 8, cellPadding: 3.5, textColor: [30, 41, 59], valign: 'middle' },
      columnStyles: { 0: { halign: 'center', cellWidth: 22 }, 1: { halign: 'center', cellWidth: 22 }, 2: { halign: 'left' }, 3: { halign: 'right', cellWidth: 28 }, 4: { halign: 'right', cellWidth: 28 }, 5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 6;
    const ehCredito = alunoAgrupado.saldoFinal >= 0;
    const corFundoFaturamento = ehCredito ? ([209, 250, 229] as [number, number, number]) : ([254, 226, 226] as [number, number, number]); 
    const corTextoFaturamento = ehCredito ? ([6, 95, 70] as [number, number, number]) : ([153, 27, 27] as [number, number, number]);

    autoTable(doc, {
      startY: finalY, margin: { left: 110 }, 
      body: [
        ['TOTAL ADIANTADO (CRÉDITOS):', `R$ ${alunoAgrupado.credito.toFixed(2)}`], ['TOTAL DE DÉBITOS EM ABERTO:', `R$ ${alunoAgrupado.totalDevido.toFixed(2)}`],
        [ { content: 'BALANÇO ATUALIZADO DA CONTA:', styles: { fontStyle: 'bold', fillColor: corFundoFaturamento, textColor: corTextoFaturamento } }, { content: `${ehCredito ? '+' : '-'} R$ ${Math.abs(alunoAgrupado.saldoFinal).toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: corFundoFaturamento, textColor: corTextoFaturamento } } ]
      ],
      theme: 'plain', styles: { fontSize: 8.5, cellPadding: 4, halign: 'right', textColor: [51, 65, 85] }, columnStyles: { 0: { cellWidth: 53 }, 1: { cellWidth: 32, fontStyle: 'bold', halign: 'right' } }
    });
    
    const pageHeight = doc.internal.pageSize.height;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
    doc.text("Este documento consiste em um demonstrativo financeiro interno de conta corrente escolar e não substitui os recibos oficiais de quitação.", 15, pageHeight - 12);
    doc.save(`Extrato_${alunoAgrupado.nome.replace(/\s+/g, '_')}.pdf`);
  }

  const alunosConsolidados = alunos.map((aluno: any) => {
    const credito = clean(aluno.saldo_credito);
    const dividasDoAluno = listaSaldosDevedores.filter((p: any) => p.aluno_id === aluno.id);
    
    const listaDividasFormatadas = dividasDoAluno.map((d: any) => ({
      id: d.id, tipo: d.tipo, descricao: d.descricao, valorTotal: clean(d.valor_total), valorPago: clean(d.valor_pago),
      valorRestante: clean(d.valor_total) - clean(d.valor_pago),
      dataPagamento: d.data_pagamento ? new Date(d.data_pagamento + "T12:00:00").toLocaleDateString('pt-BR') : '--',
      dataCriacao: d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : (d.data_pagamento ? new Date(d.data_pagamento + "T12:00:00").toLocaleDateString('pt-BR') : '--'),
      detalhes_metodos: d.detalhes_metodos
    })).filter((d: any) => d.valorRestante > 0);

    const totalDevido = listaDividasFormatadas.reduce((acc: number, curr: any) => acc + curr.valorRestante, 0);
    const saldoFinal = credito - totalDevido;

    if (credito === 0 && listaDividasFormatadas.length === 0) return null;
    return { id: aluno.id, alunoRaw: aluno, nome: aluno.nome, turma: aluno.turma, credito, totalDevido, saldoFinal, dividas: listaDividasFormatadas };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  const registrosFiltrados = alunosConsolidados.filter((item: any) => {
    const nomeLimpo = removerAcentos(item.nome?.toLowerCase());
    const buscaLimpa = removerAcentos(filtroNome.toLowerCase());
    const bateNome = nomeLimpo.includes(buscaLimpa);
    
    if (!bateNome) return false;
    if (abaAtiva === "creditos") return item.saldoFinal > 0;
    if (abaAtiva === "dividas") return item.saldoFinal < 0;
    return true;
  });

  if (carregando) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse text-xs md:text-base">Carregando Auditoria...</div>;

  return (
    <div className="w-full relative space-y-4 md:space-y-6">
      
      {/* HEADER */}
      <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight">👥 Carteira de Saldos</h1>
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Auditoria de adiantamentos e contas pendentes</p>
        </div>
        <div className="w-full md:w-auto">
          <input type="text" placeholder="🔍 Buscar aluno por nome..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} className="w-full md:w-64 p-2.5 md:p-3 bg-slate-50 md:bg-gray-100 rounded-lg md:rounded-xl text-xs md:text-sm border border-slate-200 md:border-none text-slate-800 outline-none font-medium focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
      </div>

      {/* TABS (Filtros) */}
      <div className="flex flex-row gap-2 overflow-x-auto custom-scrollbar pb-2 sm:pb-0">
        <button onClick={() => setAbaAtiva("todos")} className={`whitespace-nowrap px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black md:font-bold uppercase md:normal-case tracking-widest md:tracking-normal transition-all ${abaAtiva === "todos" ? "bg-slate-700 text-white shadow-sm" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/60"}`}>📂 Todos ({alunosConsolidados.length})</button>
        <button onClick={() => setAbaAtiva("dividas")} className={`whitespace-nowrap px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black md:font-bold uppercase md:normal-case tracking-widest md:tracking-normal transition-all ${abaAtiva === "dividas" ? "bg-rose-600 text-white shadow-sm" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/60"}`}>🔴 Devedores ({alunosConsolidados.filter((i: any) => i.saldoFinal < 0).length})</button>
        <button onClick={() => setAbaAtiva("creditos")} className={`whitespace-nowrap px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black md:font-bold uppercase md:normal-case tracking-widest md:tracking-normal transition-all ${abaAtiva === "creditos" ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/60"}`}>🟢 Credores ({alunosConsolidados.filter((i: any) => i.saldoFinal > 0).length})</button>
      </div>

      {/* TABELA / LISTA MOBILE */}
      <div className="bg-transparent md:bg-white md:rounded-2xl md:shadow-sm md:border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse block md:table md:min-w-[950px]">
          
          <thead className="hidden md:table-header-group bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
            <tr>
              <th className="p-4 w-16 text-center">INFO</th>
              <th className="p-4 w-72">Aluno / Cliente</th>
              <th className="p-4 w-40">Turma Letiva</th>
              <th className="p-4">Resumo da Ficha Escolar</th>
              <th className="p-4 w-48 text-right pr-12">Balanço Acumulado</th>
              <th className="p-4 w-36 text-center">Ações</th>
            </tr>
          </thead>
          
          <tbody className="block md:table-row-group text-sm">
            {registrosFiltrados.length > 0 ? (
              registrosFiltrados.map((item: any) => {
                const expandido = !!alunosExpandidos[item.id];
                return (
                  <Fragment key={item.id}>
                    {/* Linha Principal - Compacta no Mobile */}
                    <tr className={`grid grid-cols-2 md:table-row bg-white border border-slate-100 md:border-none p-3 md:p-0 relative shadow-sm md:shadow-none font-medium hover:bg-slate-50/40 transition-colors ${expandido ? 'rounded-t-xl md:rounded-none border-b-0 md:border-b' : 'rounded-xl md:rounded-none mb-2.5 md:mb-0 border-b border-slate-100 last:border-b-0'}`}>
                      
                      <td className="hidden md:table-cell p-4 text-center">
                        <button onClick={() => toggleAluno(item.id)} className="text-slate-400 hover:text-slate-600 focus:outline-none">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 transform transition-transform duration-200 ${expandido ? "rotate-180" : ""}`}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                        </button>
                      </td>
                      
                      {/* Aluno & Turma */}
                      <td className="col-span-2 md:table-cell p-0 md:p-4 border-b border-slate-50 md:border-none pb-1.5 md:pb-0">
                        <div className="font-bold text-slate-800 uppercase cursor-pointer hover:text-blue-600 truncate text-[13px] md:text-sm leading-tight" onClick={() => toggleAluno(item.id)}>{item.nome}</div>
                        <div className="text-[10px] md:text-xs text-slate-400 mt-0.5 font-medium">{item.turma || "Não Alocado"}</div>
                      </td>

                      {/* Resumo (Badges) */}
                      <td className="col-span-2 md:table-cell p-0 md:p-4 pb-1 md:pb-0">
                        <div className="flex flex-wrap gap-1.5 items-center mt-1 md:mt-0">
                          {item.dividas.length > 0 ? ( 
                            <span className="inline-flex px-2 py-0.5 md:px-2.5 md:py-0.5 rounded-md md:rounded-full text-[9px] md:text-xs font-black md:font-medium bg-rose-50 text-rose-700 border border-rose-100 uppercase tracking-widest md:tracking-normal md:normal-case">{item.dividas.length} em aberto</span> 
                          ) : ( 
                            <span className="inline-flex px-2 py-0.5 md:px-2.5 md:py-0.5 rounded-md md:rounded-full text-[9px] md:text-xs font-black md:font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest md:tracking-normal md:normal-case">Regular</span> 
                          )}
                          {item.credito > 0 && ( 
                            <span className="inline-flex px-2 py-0.5 md:px-2.5 md:py-0.5 rounded-md md:rounded-full text-[9px] md:text-xs font-black md:font-medium bg-sky-50 text-sky-700 border border-sky-100 uppercase tracking-widest md:tracking-normal md:normal-case">Crédito: R$ {item.credito.toFixed(2)}</span> 
                          )}
                        </div>
                      </td>

                      {/* Balanço Acumulado */}
                      <td className={`col-span-2 flex justify-between items-center md:table-cell p-0 md:p-4 text-right font-black md:font-bold text-sm md:text-base md:pr-12 mt-1 md:mt-0 ${item.saldoFinal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        <span className="md:hidden text-[9px] font-black uppercase tracking-widest text-slate-400">Balanço:</span>
                        {item.saldoFinal >= 0 ? `+ R$ ${item.saldoFinal.toFixed(2)}` : `- R$ ${Math.abs(item.saldoFinal).toFixed(2)}`}
                      </td>

                      {/* Ações (Botões) */}
                      <td className="col-span-2 flex justify-between items-center md:table-cell p-0 md:p-4 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-slate-50 md:border-none">
                        <button onClick={() => toggleAluno(item.id)} className="md:hidden text-blue-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 active:scale-95 transition-transform">
                           {expandido ? "Ocultar ⬆" : "Detalhes ⬇"}
                        </button>
                        <button onClick={() => gerarPDFExtratoAluno(item)} className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-black md:font-bold px-3 py-1.5 md:px-3 md:py-1.5 rounded-lg text-[9px] md:text-xs border border-slate-200/40 uppercase tracking-widest md:tracking-normal md:normal-case transition-colors active:scale-95">🖨️ Extrato</button>
                      </td>

                    </tr>

                    {/* Linha Expandida (Detalhes) */}
                    {expandido && (
                      <tr className="block md:table-row bg-slate-50/50 border border-t-0 border-slate-100 md:border-none rounded-b-xl md:rounded-none mb-2.5 md:mb-0 shadow-sm md:shadow-none">
                        <td colSpan={6} className="block md:table-cell p-3 md:p-4 md:pl-16 md:pr-8 border-t border-b border-slate-100/60">
                          <div className="bg-white rounded-xl border border-slate-100 shadow-inner p-3 md:p-4 space-y-2.5 md:space-y-3">
                            <h5 className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-wider">Discriminação Detalhada:</h5>
                            
                            {item.credito > 0 && (
                              <div className="flex justify-between items-center p-2.5 md:p-3 bg-emerald-50/30 border border-emerald-100 rounded-lg md:rounded-xl text-xs">
                                <div>
                                  <span className="font-bold text-emerald-800 uppercase text-[10px] md:text-xs">[🟢 ADIANTAMENTO] Saldo Credor</span>
                                  <p className="text-[9px] md:text-[10px] text-emerald-600 mt-0.5">Retido para uso automático</p>
                                </div>
                                <span className="font-black md:font-bold text-emerald-600 text-xs md:text-sm">+ R$ {item.credito.toFixed(2)}</span>
                              </div>
                            )}
                            
                            {item.dividas.map((div: any) => (
                              <div key={div.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 p-2.5 md:p-3 bg-white border border-slate-100 rounded-lg md:rounded-xl shadow-sm hover:border-slate-200 transition-all">
                                <div>
                                  <span className="font-bold text-slate-700 uppercase text-[10px] md:text-xs leading-tight">[{div.tipo}] {div.descricao}</span>
                                  <p className="text-[9px] md:text-[10px] text-slate-400 mt-0.5 font-medium">Lanc: {div.dataCriacao} | Restante: R$ {div.valorRestante.toFixed(2)}</p>
                                </div>
                                <button onClick={() => router.push(`/admin/pdv?alunoId=${item.alunoRaw.id}`)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black md:font-bold uppercase md:normal-case tracking-widest md:tracking-normal px-3 py-1.5 md:px-4 md:py-2 rounded-md md:rounded-lg text-[9px] md:text-[11px] shadow-sm transition-all active:scale-95">🟢 + Receber</button>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <tr className="block md:table-row bg-white">
                <td colSpan={6} className="block md:table-cell p-6 md:p-8 text-center text-slate-400 italic text-xs md:text-sm border border-slate-100 rounded-xl md:border-none">Nenhum saldo ou crédito encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}