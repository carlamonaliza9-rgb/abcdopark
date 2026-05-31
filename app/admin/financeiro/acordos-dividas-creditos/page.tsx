"use client";

import { useState, useEffect, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { TabelaMensalidades } from "@/app/dashboard/financeiro/_components/TabelaMensalidades";

const clean = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};
const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SENHA_MESTRA = "1234";

// ============================================================================
// 1. COMPONENTE DA VISÃO DE MENSALIDADES (Gerenciamento Mensal)
// ============================================================================
function VisaoMensalidades({ userEmail }: { userEmail: string | null }) {
  const router = useRouter();
  const [valorPadrao, setValorPadrao] = useState(550);
  const [editandoValor, setEditandoValor] = useState(false);
  const [inicializado, setInicializado] = useState(false);
  
  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroTurma, setFiltroTurma] = useState(""); 
  const [alunos, setAlunos] = useState<any[]>([]);
  const [listaReceitasDetalhada, setListaReceitasDetalhada] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [mesReferencia, setMesReferencia] = useState(mesesAno[new Date().getMonth()]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const valorSalvo = localStorage.getItem('valorPadraoMensalidade');
      if (valorSalvo) setValorPadrao(Number(valorSalvo));
    }
    setInicializado(true);
  }, []);

  async function carregarDados() {
    setCarregando(true);
    try {
      let valorBaseVigente = valorPadrao;
      if (typeof window !== 'undefined') {
        const salvo = localStorage.getItem('valorPadraoMensalidade');
        if (salvo && !editandoValor) valorBaseVigente = Number(salvo);
      }

      const hoje = new Date();
      const [ano, mes] = mesFiltro.split('-');
      const dataInicioAno = `${ano}-01-01`;
      const dataFimAno = `${ano}-12-31`;

      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      const { data: pgtosAno } = await supabase.from('historico_pagamentos').select('*').gte('data_pagamento', dataInicioAno).lte('data_pagamento', dataFimAno);
      
      const pgtosAnoSeguro = pgtosAno || [];
      setListaReceitasDetalhada(pgtosAnoSeguro);

      const nomeMesReferencia = mesesAno[parseInt(mes) - 1];
      const pgtosDesteMes = pgtosAnoSeguro.filter((p: any) => p.tipo === 'mensalidade' && (p.descricao || '').includes(nomeMesReferencia));
      
      const acordosDesteMes = pgtosAnoSeguro.filter((p: any) => {
        const isAcordo = p.tipo === 'acordo';
        const isNoMesFiltro = p.data_pagamento && p.data_pagamento.startsWith(mesFiltro);
        const isAvulso = p.mes_referencia === 'Avulso';
        const desc = (p.descricao || '').toLowerCase();
        const isVendaOuTaxa = desc.includes('uniforme') || desc.includes('material') || desc.includes('livro') || desc.includes('evento') || desc.includes('avulso') || desc.includes('taxa');
        return isAcordo && isNoMesFiltro && !isAvulso && !isVendaOuTaxa;
      });

      if (listaAlunos) {
        const ordenados = listaAlunos.map((aluno: any) => {
          const pgtoMensalidade = pgtosDesteMes.find((p: any) => p.aluno_id === aluno.id);
          const statusMensalidadeDB = pgtoMensalidade ? pgtoMensalidade.status : 'pendente';
          const valorPagoMensalidade = pgtoMensalidade ? clean(pgtoMensalidade.valor_pago) : 0;

          const acordoAluno = acordosDesteMes.find((a: any) => a.aluno_id === aluno.id && a.status !== 'pago');
          
          let valorBaseMensalidade = clean(aluno.valor) || valorBaseVigente;
          let isMensalidadePendente = statusMensalidadeDB !== 'pago'; 
          
          let valorDevidoMensalidade = valorBaseMensalidade;
          if (statusMensalidadeDB === 'parcial' || statusMensalidadeDB === 'pago') {
              valorDevidoMensalidade = Math.max(0, valorBaseMensalidade - valorPagoMensalidade);
          }

          let temAcordoNoMes = !!acordosDesteMes.find((a: any) => a.aluno_id === aluno.id);
          let isAcordoPendente = temAcordoNoMes && (!acordoAluno || acordoAluno.status !== 'pago');
          let valorParcelaAcordo = acordoAluno ? clean(acordoAluno.valor_total) : 0;
          if (acordoAluno && acordoAluno.status === 'parcial') {
              valorParcelaAcordo = Math.max(0, valorParcelaAcordo - clean(acordoAluno.valor_pago));
          }
          let idPagamentoAcordo = acordoAluno ? acordoAluno.id : null;

          let valorTotalDevido = 0;
          let nomeTags = [];

          if (isMensalidadePendente && valorDevidoMensalidade > 0) {
              valorTotalDevido += valorDevidoMensalidade;
              if (statusMensalidadeDB === 'parcial') nomeTags.push(`⏳ Parcial (-R$ ${valorPagoMensalidade.toFixed(2)})`);
          }
          
          if (isAcordoPendente && valorParcelaAcordo > 0) {
              valorTotalDevido += valorParcelaAcordo;
              nomeTags.push(`📌 Acordo R$ ${valorParcelaAcordo.toFixed(2)}`);
          } else if (temAcordoNoMes && !isAcordoPendente) {
              nomeTags.push(`✅ Acordo Pago`); 
          }

          let nomeExibicao = nomeTags.length > 0 ? `${aluno.nome} (${nomeTags.join(' | ')})` : aluno.nome;

          let statusFinal = 'pendente';
          if (!isMensalidadePendente && !isAcordoPendente) {
               statusFinal = 'pago';
          } else if (statusMensalidadeDB === 'parcial' || (acordoAluno && acordoAluno.status === 'parcial')) {
               statusFinal = 'parcial';
          } else if (statusMensalidadeDB === 'atrasado' || (isAcordoPendente && hoje > new Date(acordoAluno.data_pagamento + "T12:00:00")) || hoje.getDate() > (parseInt(aluno.vencimento) || 1)) {
               statusFinal = 'atrasado';
          }

          return {
            ...aluno,
            status: statusFinal,
            valor: valorTotalDevido > 0 ? valorTotalDevido : valorBaseMensalidade,
            nome: nomeExibicao,
            isAcordo: isAcordoPendente, 
            idPagamentoAcordo: idPagamentoAcordo,
            valorParcelaAcordo: valorParcelaAcordo,
            isMensalidadePendente: isMensalidadePendente,
            valorBaseMensalidade,
            temAcordoNoMes 
          };
        }).sort((a: any, b: any) => (a.status === 'pago' ? 1 : 0) - (b.status === 'pago' ? 1 : 0) || (parseInt(a.vencimento) || 0) - (parseInt(b.vencimento) || 0));
        
        setAlunos(ordenados);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally { setCarregando(false); }
  }

  useEffect(() => { 
    if(inicializado) carregarDados(); 
  }, [mesFiltro, inicializado]);

  if (carregando) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse">Sincronizando mensalidades...</div>;

  const listaTurmasUnicas = Array.from(new Set(alunos.map((aluno: any) => aluno.turma).filter((t: any) => !!t))).sort();
  const alunosFiltrados = alunos.filter((aluno: any) => {
    const correspondeNome = aluno.nome?.toLowerCase().includes(filtroNome.toLowerCase());
    const correspondeTurma = filtroTurma === "" || aluno.turma === filtroTurma;
    return correspondeNome && correspondeTurma;
  });

  return (
    <div className="w-full relative">
      <div className="space-y-6">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🏫 Mensalidades</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Gestão de Recebimentos e Baixas Operacionais</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            
            <div className={`flex items-center border rounded-xl px-3 py-2 shadow-sm transition-all h-[44px] ${editandoValor ? 'bg-white border-indigo-400 ring-2 ring-indigo-500/20' : 'bg-slate-50 border-slate-200'}`}>
              <button 
                onClick={() => { 
                  if (!editandoValor) {
                    if (prompt("Digite a Senha Mestra para desbloquear a mensalidade base:") === SENHA_MESTRA) {
                      setEditandoValor(true);
                    } else {
                      alert("Senha incorreta!");
                    }
                  } else {
                    setEditandoValor(false);
                    localStorage.setItem('valorPadraoMensalidade', valorPadrao.toString());
                    carregarDados();
                  }
                }} 
                className="text-sm mr-2 opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
                title={editandoValor ? "Salvar valor padrão" : "Desbloquear valor base"}
              >
                {editandoValor ? "💾" : "🔒"}
              </button>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-400">R$</span>
                <input 
                  type="number" 
                  value={valorPadrao} 
                  disabled={!editandoValor} 
                  onChange={(e) => setValorPadrao(Number(e.target.value))} 
                  className="w-12 bg-transparent border-none text-sm font-black text-slate-700 text-center outline-none p-0 disabled:opacity-80" 
                />
              </div>
            </div>

            <select
              value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)}
              className="w-full sm:w-auto px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors text-xs uppercase tracking-wider h-[44px]"
            >
              <option value="">Todas as Turmas</option>
              {listaTurmasUnicas.map((turma: any) => (
                <option key={turma as string} value={turma as string}>{(turma as string).toUpperCase()}</option>
              ))}
            </select>
            <input
              type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}
              className="w-full sm:w-auto px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors text-sm h-[44px]"
            />
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <TabelaMensalidades
            alunos={alunosFiltrados} filtroNome={filtroNome} setFiltroNome={setFiltroNome}
            onPagamento={(a: any) => {
              router.push(`/admin/pdv?alunoId=${a.id}`);
            }}
            onCobrar={(a: any) => {
              const msg = `Olá! Passando para lembrar que a mensalidade escolar de *${a.nome}*, referente a *${mesReferencia}*, venceu no dia *${a.vencimento}*.\n\n• *Valor:* R$ ${a.valor || valorPadrao}\n\nCaso já tenha realizado o pagamento, por favor, nos envie o comprovante para darmos a baixa no sistema. \n\nTenha um excelente dia! ✨`;
              window.open(`https://wa.me/55${a.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
            }}
            onDesfazer={async (idAlunoSelecionado: string) => {
              if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla Monaliza pode desfazer registros salvos.");
              if (prompt("Digite a Senha Mestra para confirmar o estorno financeiro e reajuste da carteira:") !== SENHA_MESTRA) return alert("Senha incorreta.");
              
              const alunoObj = alunosFiltrados.find((a: any) => a.id === idAlunoSelecionado);
              const [ano, mes] = mesFiltro.split('-');
              const nomeMesRef = mesesAno[parseInt(mes) - 1];

              let acao = 'mensalidade';
              if (alunoObj?.temAcordoNoMes && !alunoObj?.isMensalidadePendente) {
                   const opcao = prompt("Esse aluno possui Mensalidade e Acordo pagos.\n[ 1 ] Desfazer MENSALIDADE\n[ 2 ] Desfazer ACORDO");
                   if (opcao !== '1' && opcao !== '2') return;
                   acao = opcao === '1' ? 'mensalidade' : 'acordo';
              } else if (alunoObj?.temAcordoNoMes && alunoObj?.isMensalidadePendente) {
                   if(!confirm("Desfazer recebimento do ACORDO? (Mensalidade já está pendente).")) return;
                   acao = 'acordo';
              } else {
                   if(!confirm("Desfazer recebimento da mensalidade? O saldo virtual será reajustado se houver troco/crédito envolvido.")) return;
              }

              let variacaoCredito = 0;
              let idsExcluidos: string[] = [];
              
              if (acao === 'mensalidade') {
                   // Nova busca inteligente que ignora variações no texto de descrição
                   const { data: mensalidadesTodas } = await supabase.from('historico_pagamentos').select('*')
                       .eq('aluno_id', idAlunoSelecionado)
                       .eq('tipo', 'mensalidade');
                       
                   const mensalidades = (mensalidadesTodas || []).filter((m: any) => {
                       const matchMes = m.mes_referencia === nomeMesRef || (m.descricao || "").includes(nomeMesRef);
                       const matchAno = (m.data_pagamento || "").startsWith(ano) || (m.descricao || "").includes(ano);
                       return matchMes && matchAno;
                   });
                       
                   if (mensalidades && mensalidades.length > 0) {
                       for (const m of mensalidades) {
                           idsExcluidos.push(String(m.id));
                           
                           variacaoCredito += clean(m.detalhes_metodos?.credito_aluno);
                           
                           const parciais = m.detalhes_metodos?.historico_parciais || [];
                           parciais.forEach((p: any) => { 
                             variacaoCredito += clean(p.credito_utilizado) + clean(p.credito_utilizado_nesta_parcela); 
                           });
                       }
                       await supabase.from('historico_pagamentos').delete().in('id', idsExcluidos);
                   }
                   await supabase.from('alunos').update({ status: 'pendente' }).eq('id', idAlunoSelecionado);
                   
              } else {
                   const { data: acordo } = await supabase.from('historico_pagamentos').select('*').eq('id', alunoObj.idPagamentoAcordo).single();
                   if (acordo) {
                       idsExcluidos.push(String(acordo.id));
                       variacaoCredito += clean(acordo.detalhes_metodos?.credito_aluno);
                       
                       const parciais = acordo.detalhes_metodos?.historico_parciais || [];
                       parciais.forEach((p: any) => { 
                         variacaoCredito += clean(p.credito_utilizado) + clean(p.credito_utilizado_nesta_parcela); 
                       });
                       
                       await supabase.from('historico_pagamentos').update({ status: 'pendente', valor_pago: 0, detalhes_metodos: {} }).eq('id', alunoObj.idPagamentoAcordo);
                   }
              }

              // Estorno Aprimorado de Troco via Rastreamento de Origem do PDV
              if (idsExcluidos.length > 0) {
                  const { data: todosCreditos } = await supabase.from('historico_pagamentos')
                      .select('*')
                      .eq('aluno_id', idAlunoSelecionado)
                      .eq('tipo', 'credito');

                  if (todosCreditos && todosCreditos.length > 0) {
                      const creditosParaDeletar = todosCreditos.filter((c: any) => {
                          const origens = c.detalhes_metodos?.ids_origem;
                          if (origens) {
                              const strOrigens = Array.isArray(origens) ? origens.map(String) : [String(origens)];
                              return idsExcluidos.some(id => strOrigens.includes(id));
                          }
                          // Fallback legado mais amplo e permissivo
                          const descLower = (c.descricao || "").toLowerCase();
                          if (acao === 'mensalidade' && descLower.includes(nomeMesRef.toLowerCase()) && descLower.includes('troco')) return true;
                          return false;
                      });

                      if (creditosParaDeletar.length > 0) {
                          for (const cg of creditosParaDeletar) {
                              variacaoCredito -= clean(cg.valor_total); // Subtrai o troco indevido da carteira
                          }
                          await supabase.from('historico_pagamentos').delete().in('id', creditosParaDeletar.map(cg => cg.id));
                      }
                  }
              }

              if (variacaoCredito !== 0) {
                   const { data: al } = await supabase.from('alunos').select('saldo_credito').eq('id', idAlunoSelecionado).single();
                   if (al) {
                       const novoSaldo = Math.max(0, clean(al.saldo_credito) + variacaoCredito);
                       await supabase.from('alunos').update({ saldo_credito: novoSaldo }).eq('id', idAlunoSelecionado);
                   }
              }
              
              carregarDados();
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. COMPONENTE DA VISÃO DE SALDOS E CRÉDITOS (Auditoria Global)
// ============================================================================
function VisaoSaldosCreditos() {
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

        const ordemHierarquicaTurmas = ["maternal", "jardim", "jardim i", "jardim ii", "jardim 1", "jardim 2", "1º ano", "2º ano", "3º ano", "4º ano", "5º ano"];

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

        if (pgtosPendentes) setListaSaldosDevedores(pgtosPendentes);
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
    if (alunoAgrupado.grid || alunoAgrupado.credito > 0) tableRows.push(["--", "--", "SALDO CREDOR RETIDO (ADIANTAMENTOS EM CONTA)", "-", "-", `+ R$ ${alunoAgrupado.credito.toFixed(2)}`]);

    alunoAgrupado.dividas.forEach((it: any) => { tableRows.push([ it.dataCriacao, it.dataPagamento, it.descricao.toUpperCase(), `R$ ${it.valorTotal.toFixed(2)}`, `R$ ${it.valorPago.toFixed(2)}`, `R$ ${it.valorRestante.toFixed(2)}` ]); });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6, head: [['DATA VENDA', 'ÚLT. MOV.', 'HISTÓRICO DO LANÇAMENTO', 'VALOR ORIGINAL', 'VALOR ABATIDO', 'DÉBITO ATUAL']], body: tableRows,
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
    const bateNome = item.nome?.toLowerCase().includes(filtroNome.toLowerCase());
    if (!bateNome) return false;
    if (abaAtiva === "creditos") return item.saldoFinal > 0;
    if (abaAtiva === "dividas") return item.saldoFinal < 0;
    return true;
  });

  if (carregando) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse">Carregando Auditoria...</div>;

  return (
    <div className="w-full relative">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">👥 Carteira de Saldos & Créditos</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Auditoria geral de adiantamentos e contas pendentes agrupados por aluno</p>
        </div>
        <div>
          <input type="text" placeholder="🔍 Buscar aluno por nome..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} className="p-3 bg-gray-100 rounded-xl text-sm border-none text-gray-800 outline-none w-64 font-medium" />
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setAbaAtiva("todos")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${abaAtiva === "todos" ? "bg-slate-700 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60"}`}>📂 Todos ({alunosConsolidados.length})</button>
        <button onClick={() => setAbaAtiva("dividas")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${abaAtiva === "dividas" ? "bg-rose-600 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60"}`}>🔴 Apenas Devedores ({alunosConsolidados.filter((i: any) => i.saldoFinal < 0).length})</button>
        <button onClick={() => setAbaAtiva("creditos")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${abaAtiva === "creditos" ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60"}`}>🟢 Apenas Saldo Credor ({alunosConsolidados.filter((i: any) => i.saldoFinal > 0).length})</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 w-16 text-center">INFO</th><th className="p-4 w-72">Aluno / Cliente</th><th className="p-4 w-40">Turma Letiva</th>
                <th className="p-4">Resumo da Ficha Escolar</th><th className="p-4 w-48 text-right pr-12">Balanço Acumulado</th><th className="p-4 w-36 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {registrosFiltrados.length > 0 ? (
                registrosFiltrados.map((item: any) => {
                  const expandido = !!alunosExpandidos[item.id];
                  return (
                    <Fragment key={item.id}>
                      <tr className="hover:bg-slate-50/40 transition-colors font-medium">
                        <td className="p-4 text-center">
                          <button onClick={() => toggleAluno(item.id)} className="text-slate-400 hover:text-slate-600 focus:outline-none">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 transform transition-transform duration-200 ${expandido ? "rotate-180" : ""}`}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                          </button>
                        </td>
                        <td onClick={() => toggleAluno(item.id)} className="p-4 font-bold text-slate-800 uppercase cursor-pointer hover:text-blue-600 truncate">{item.nome}</td>
                        <td className="p-4 text-slate-500 uppercase font-semibold truncate">{item.turma || "Não Alocado"}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {item.dividas.length > 0 ? ( <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">{item.dividas.length} em aberto</span> ) : ( <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">Regular</span> )}
                            {item.credito > 0 && ( <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100">Crédito: R$ {item.credito.toFixed(2)}</span> )}
                          </div>
                        </td>
                        <td className={`p-4 text-right font-bold text-base pr-12 ${item.saldoFinal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{item.saldoFinal >= 0 ? `+ R$ ${item.saldoFinal.toFixed(2)}` : `- R$ ${Math.abs(item.saldoFinal).toFixed(2)}`}</td>
                        <td className="p-4 text-center"><button onClick={() => gerarPDFExtratoAluno(item)} className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-200/40">🖨️ Extrato</button></td>
                      </tr>
                      {expandido && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={6} className="p-4 pl-16 pr-8 border-t border-b border-gray-100/60">
                            <div className="bg-white rounded-xl border border-gray-100 shadow-inner p-3 space-y-2">
                              <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Discriminação Detalhada das Contas do Aluno:</h5>
                              {item.credito > 0 && (
                                <div className="flex justify-between items-center py-2.5 px-4 bg-emerald-50/30 border border-emerald-100 rounded-xl text-xs">
                                  <div>
                                    <span className="font-bold text-emerald-800 uppercase">[🟢 ADIANTAMENTO] Saldo Credor</span>
                                    <p className="text-[10px] text-emerald-600">Retido em conta para uso em futuras amortizações automáticas</p>
                                  </div>
                                  <span className="font-bold text-emerald-600 text-sm">+ R$ {item.credito.toFixed(2)}</span>
                                </div>
                              )}
                              {item.dividas.map((div: any) => (
                                <div key={div.id} className="flex justify-between items-center py-2.5 px-4 bg-white border border-gray-100 rounded-xl text-xs shadow-sm hover:border-gray-200 transition-all">
                                  <div>
                                    <span className="font-bold text-slate-700 uppercase">[{div.tipo}] {div.descricao}</span>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Lançamento: {div.dataCriacao} | Restante: R$ {div.valorRestante.toFixed(2)}</p>
                                  </div>
                                  <button onClick={() => router.push(`/admin/pdv?alunoId=${item.alunoRaw.id}`)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] shadow-sm transition-all">🟢 + PGTO</button>
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
                <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Nenhum saldo ou crédito encontrado com os filtros aplicados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. COMPONENTE DA VISÃO DE ACORDOS E PARCELAMENTOS (Dívida Ativa Histórica)
// ============================================================================
function VisaoAcordos({ userEmail }: { userEmail: string | null }) {
  const [carregando, setCarregando] = useState(true);
  const [acordosAgrupados, setAcordosAgrupados] = useState<any[]>([]);
  const [filtroNome, setFiltroNome] = useState("");
  const [alunoExpandido, setAlunoExpandido] = useState<string | null>(null);
  const [editandoObs, setEditandoObs] = useState<string | null>(null);
  const [textoObs, setTextoObs] = useState("");

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    setCarregando(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      
      const { data: todosAcordos } = await supabase.from('historico_pagamentos').select('*').eq('tipo', 'acordo').order('data_pagamento', { ascending: true });

      if (listaAlunos && todosAcordos) {
        const agrupados = listaAlunos.map((aluno: any) => {
          const parcelasDoAluno = todosAcordos.filter((a: any) => a.aluno_id === aluno.id);
          if (parcelasDoAluno.length === 0) return null;

          const contratosMap = new Map();
          parcelasDoAluno.forEach((p: any) => {
             const chave = p.created_at ? p.created_at.substring(0, 16) : p.data_pagamento;
             if (!contratosMap.has(chave)) contratosMap.set(chave, []);
             contratosMap.get(chave).push({
               ...p,
               status: (p.status !== 'pago' && p.data_pagamento < hoje) ? 'atrasado' : p.status
             });
          });

          const contratosArray = Array.from(contratosMap.values()).map((parcelasContrato: any) => {
             const valorTotal = parcelasContrato.reduce((acc: number, p: any) => acc + clean(p.valor_total), 0);
             const valorPago = parcelasContrato.filter((p: any) => p.status === 'pago').reduce((acc: number, p: any) => acc + clean(p.valor_pago || p.valor_total), 0);
             const dataInicio = parcelasContrato[0]?.created_at?.split('T')[0] || parcelasContrato[0]?.data_pagamento;
             const responsavel = parcelasContrato[0]?.detalhes_metodos?.criado_por || "Sistema/Admin";
             const qtdParcelas = parcelasContrato.length;

             return {
                idBase: parcelasContrato[0].id,
                parcelas: parcelasContrato,
                valorTotal,
                valorPago,
                dataInicio,
                responsavel,
                qtdParcelas,
                progresso: Math.round((valorPago / valorTotal) * 100) || 0
             };
          });

          const totalGeralPago = contratosArray.reduce((acc: number, c: any) => acc + c.valorPago, 0);
          const totalGeralDevido = contratosArray.reduce((acc: number, c: any) => acc + c.valorTotal, 0);
          const progressoGeral = Math.round((totalGeralPago / totalGeralDevido) * 100) || 0;
          const resumoParcelas = contratosArray.map((c: any) => `${c.qtdParcelas}x`).join(' e ');

          return { 
            ...aluno, 
            contratos: contratosArray,
            totalGeralPago,
            totalGeralDevido,
            progressoGeral,
            qtdAcordos: contratosArray.length,
            resumoParcelas,
            observacoes_financeiras: aluno.observacoes_financeiras
          };
        }).filter((item: any) => !!item);

        setAcordosAgrupados(agrupados as any[]);
      }
    } catch (e) { console.error(e); }
    setCarregando(false);
  }

  async function salvarObservacao(alunoId: string) {
    await supabase.from('alunos').update({ observacoes_financeiras: textoObs }).eq('id', alunoId);
    setAcordosAgrupados(acordosAgrupados.map((a: any) => a.id === alunoId ? { ...a, observacoes_financeiras: textoObs } : a));
    setEditandoObs(null);
  }

  // --- FUNÇÕES DE GERENCIAMENTO DE ACORDOS ---
  async function desfazerParcela(id: string) {
    if (prompt("Digite a Senha Mestra para ESTORNAR o pagamento desta parcela:") !== SENHA_MESTRA) return alert("Senha incorreta.");
    await supabase.from('historico_pagamentos').update({ status: 'pendente', valor_pago: 0, detalhes_metodos: {} }).eq('id', id);
    carregarDados();
  }

  async function excluirParcela(id: string) {
    if (prompt("Digite a Senha Mestra para EXCLUIR esta parcela:") !== SENHA_MESTRA) return alert("Senha incorreta.");
    await supabase.from('historico_pagamentos').delete().eq('id', id);
    carregarDados();
  }

  async function excluirAcordoInteiro(parcelas: any[]) {
    if (prompt("ATENÇÃO: Digite a Senha Mestra para EXCLUIR O CONTRATO INTEIRO (todas as parcelas):") !== SENHA_MESTRA) return alert("Senha incorreta.");
    const ids = parcelas.map(p => p.id);
    await supabase.from('historico_pagamentos').delete().in('id', ids);
    carregarDados();
  }

  async function editarParcela(parcela: any) {
    if (prompt("Digite a Senha Mestra para EDITAR os valores:") !== SENHA_MESTRA) return alert("Senha incorreta.");
    const novoValor = prompt("Novo valor da parcela (ex: 150.00):", clean(parcela.valor_total).toString());
    if (!novoValor) return;
    const novaData = prompt("Novo vencimento (AAAA-MM-DD):", parcela.data_pagamento);
    if (!novaData) return;
    
    await supabase.from('historico_pagamentos').update({
      valor_total: clean(novoValor),
      data_pagamento: novaData
    }).eq('id', parcela.id);
    carregarDados();
  }

  const dadosFiltrados = acordosAgrupados.filter((a: any) => a.nome.toLowerCase().includes(filtroNome.toLowerCase()));

  if (carregando) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse">Carregando Dívida Ativa...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🤝 Acordos Realizados</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Parcelamentos Especiais e Histórico Detalhado de Renegociações</p>
        </div>
        <input type="text" placeholder="🔍 Buscar aluno..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} className="w-full sm:w-64 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors text-sm" />
      </div>

      <div className="space-y-4">
        {dadosFiltrados.length === 0 ? (
          <div className="text-center p-10 text-slate-400 font-bold bg-white rounded-2xl border">Nenhum acordo registrado.</div>
        ) : (
          dadosFiltrados.map((aluno: any) => {
            return (
              <div key={aluno.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 cursor-pointer hover:bg-slate-50" onClick={() => setAlunoExpandido(alunoExpandido === aluno.id ? null : aluno.id)}>
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl">{aluno.nome.charAt(0)}</div>
                    <div>
                      <h2 className="font-bold" style={{ fontSize: '18px' }}>{aluno.nome}</h2>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        📝 {aluno.qtdAcordos} acordo(s) ativo(s) parcelado(s) em: <b className="text-indigo-600">{aluno.resumoParcelas}</b> | 👤 Gestor Base: {aluno.contratos[0]?.responsavel}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end min-w-[220px]">
                    <span className="text-xs font-bold text-slate-500 mb-1">Quitado Geral: <b className="text-emerald-500">R$ {aluno.totalGeralPago.toFixed(2)}</b> de R$ {aluno.totalGeralDevido.toFixed(2)}</span>
                    <div className="w-full bg-slate-100 rounded-full h-2 shadow-inner"><div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${aluno.progressoGeral}%` }} /></div>
                  </div>
                </div>

                {alunoExpandido === aluno.id && (
                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col lg:grid lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
                    <div className="lg:col-span-8 space-y-4">
                      
                      {aluno.contratos.map((contrato: any, cIdx: number) => (
                        <div key={cIdx} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                          <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
                            <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                              Contrato {cIdx + 1} - Firmado em {contrato.dataInicio?.split('-').reverse().join('/')} ({contrato.qtdParcelas} Parcela(s))
                            </span>
                            <button onClick={() => excluirAcordoInteiro(contrato.parcelas)} className="text-[10px] text-rose-500 font-bold hover:underline bg-rose-50 px-2 py-1 rounded">
                              🗑️ Excluir Contrato Inteiro
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {contrato.parcelas.map((parcela: any) => {
                              const estaPago = parcela.status === 'pago';
                              return (
                                <div key={parcela.id} className={`flex justify-between items-center p-3 rounded-lg border text-xs transition-colors ${estaPago ? 'bg-slate-100/50 border-slate-200 opacity-60' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`}>
                                  <div className="flex flex-col gap-0.5">
                                    <span className={`font-bold uppercase ${estaPago ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{parcela.descricao}</span>
                                    <span className="text-[10px] text-slate-400">Vencimento: {parcela.data_pagamento?.split('-').reverse().join('/')}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`font-bold ${estaPago ? 'text-slate-400' : 'text-slate-800'}`}>R$ {clean(parcela.valor_total).toFixed(2)}</span>
                                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${estaPago ? 'bg-emerald-100 text-emerald-700' : parcela.status === 'atrasado' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{parcela.status}</span>
                                    
                                    <div className="flex gap-2 border-l border-slate-200 pl-3 ml-1">
                                      {estaPago ? (
                                        <button onClick={() => desfazerParcela(parcela.id)} className="text-slate-400 hover:text-amber-600 text-sm" title="Estornar Pagamento">🔄</button>
                                      ) : (
                                        <>
                                          <button onClick={() => editarParcela(parcela)} className="text-slate-400 hover:text-indigo-600 text-sm" title="Editar Parcela">✏️</button>
                                          <button onClick={() => excluirParcela(parcela.id)} className="text-slate-400 hover:text-rose-600 text-sm" title="Excluir Parcela">🗑️</button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                    </div>
                    
                    <div className="lg:col-span-4 flex flex-col h-full">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Observações Internas da Secretaria</h4>
                      {editandoObs === aluno.id ? (
                        <div className="flex flex-col gap-2 flex-1">
                          <textarea value={textoObs} onChange={(e) => setTextoObs(e.target.value)} className="w-full flex-1 p-3 rounded-xl border border-slate-200 outline-none text-xs resize-none bg-white min-h-[120px]" placeholder="Insira os termos firmados de pagamento..." />
                          <div className="flex gap-2 justify-end"><button onClick={() => setEditandoObs(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 rounded-lg">Cancelar</button><button onClick={() => salvarObservacao(aluno.id)} className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg shadow-sm">Gravar Notas</button></div>
                        </div>
                      ) : (
                        <div onClick={() => { setTextoObs(aluno.observacoes_financeiras || ""); setEditandoObs(aluno.id); }} className="flex-1 p-4 bg-white border border-slate-100 rounded-xl text-xs text-slate-600 cursor-pointer hover:border-indigo-300 transition-colors whitespace-pre-wrap min-h-[120px] relative group">
                          {aluno.observacoes_financeiras || <span className="text-slate-400 italic">Nenhum termo registrado. Clique para adicionar detalhes operacionais...</span>}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-400 text-[10px] transition-opacity">✏️ EDITAR</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL MESTRE (Página Base Expandida com Proporção Ampla)
// ============================================================================
export default function ControleFinanceiroUnificadoPage() {
  const router = useRouter();
  const [visaoAtiva, setVisaoAtiva] = useState<"mensalidades" | "saldos" | "acordos">("mensalidades");
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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
    <div className="w-full bg-slate-50 min-h-screen font-sans antialiased text-slate-800 pb-24 md:p-6 lg:p-8 flex flex-col">
      {/* HEADER DE TABS MASTER EXPANDIDO */}
      <div className="max-w-[1700px] w-full mx-auto mb-6 px-4">
        <div className="flex bg-slate-200/60 p-1.5 rounded-2xl w-fit border border-slate-300/40">
          <button
            onClick={() => setVisaoAtiva("mensalidades")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${visaoAtiva === "mensalidades" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            📅 Mensalidades
          </button>
          <button
            onClick={() => setVisaoAtiva("saldos")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${visaoAtiva === "saldos" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            👥 Saldos e Créditos
          </button>
          <button
            onClick={() => setVisaoAtiva("acordos")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${visaoAtiva === "acordos" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            🤝 Acordos
          </button>
        </div>
      </div>

      {/* RENDERIZAÇÃO CENTRALIZADA DENTRO DO NOVO CONTAINER WIDE */}
      <div className="max-w-[1700px] w-full mx-auto px-4 flex-1">
        {visaoAtiva === "mensalidades" ? (
          <VisaoMensalidades userEmail={userEmail} />
        ) : visaoAtiva === "saldos" ? (
          <VisaoSaldosCreditos />
        ) : (
          <VisaoAcordos userEmail={userEmail} />
        )}
      </div>
    </div>
  );
}