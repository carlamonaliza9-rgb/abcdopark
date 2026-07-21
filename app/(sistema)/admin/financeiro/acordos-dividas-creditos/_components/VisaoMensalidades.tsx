"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { removerAcentos } from "@/lib/utils"; 
import { 
  Home, 
  Search, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Percent, 
  CalendarDays, 
  MoreVertical, 
  Wallet, 
  MessageCircle,
  AlertCircle
} from "lucide-react";

const clean = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};

const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SENHA_MESTRA = "1234";

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

export function VisaoMensalidades({ userEmail }: { userEmail: string | null }) {
  const [valorPadrao, setValorPadrao] = useState(550);
  const [editandoValor, setEditandoValor] = useState(false);
  const [inicializado, setInicializado] = useState(false);
  
  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroTurma, setFiltroTurma] = useState(""); 
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  const [mesReferencia, setMesReferencia] = useState(mesesAno[new Date().getMonth()]);

  // Lógica corrigida para os cards de métricas
  const pendentesArr = alunos.filter(a => a.status === 'pendente' || a.status === 'parcial');
  const pagosArr = alunos.filter(a => a.status === 'pago');
  const atrasadosArr = alunos.filter(a => a.status === 'atrasado');
  const aReceberArr = alunos.filter(a => a.status !== 'pago'); // Todos que ainda não pagaram

  const valReceber = aReceberArr.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const valRecebidos = pagosArr.reduce((acc, curr) => acc + (curr.valorBaseMensalidade || 0), 0);
  const valAtrasados = atrasadosArr.reduce((acc, curr) => acc + (curr.valor || 0), 0);

  const totalMensalidades = alunos.length;
  const taxaRecebimento = totalMensalidades > 0 ? Math.round((pagosArr.length / totalMensalidades) * 100) : 0;

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

      const hojeObj = new Date();
      hojeObj.setHours(0,0,0,0);
      
      const [ano, mes] = mesFiltro.split('-');
      const nomeMesReferencia = mesesAno[parseInt(mes) - 1].toLowerCase();
      setMesReferencia(mesesAno[parseInt(mes) - 1]);

      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      
      const { data: pgtosAnoDB } = await supabase.from('historico_pagamentos')
        .select('*')
        .in('tipo', ['mensalidade', 'acordo'])
        .neq('status', 'cancelado')
        .neq('status', 'estornado');
      
      let historicoCompleto = pgtosAnoDB || [];

      const mesesPagos = new Set();
      // --- REGRA 1 & 2: Considerar 'renegociado' como já tratado ---
      historicoCompleto.forEach(h => {
          if (h.status === 'pago' || h.status === 'renegociado') {
              const ref = extrairMesAnoInteligente(h, ano);
              if (ref.mes && ref.ano) mesesPagos.add(`${h.aluno_id}_${ref.mes}_${ref.ano}`);
          }
      });

      const missingMensalidades: any[] = [];
      const apenasMensalidades = historicoCompleto.filter(p => p.tipo === 'mensalidade');

      listaAlunos?.forEach(aluno => {
          mesesAno.forEach((nomeMes, indexMes) => {
              const descMes = nomeMes.toLowerCase();
              const chaveGlobal = `${aluno.id}_${descMes}_${ano}`;

              if (mesesPagos.has(chaveGlobal)) return;

              const jaCriadoFisicamente = apenasMensalidades.some(p => {
                  const ref = extrairMesAnoInteligente(p, ano);
                  return p.aluno_id === aluno.id && ref.mes === descMes && ref.ano === ano;
              });

              if (!jaCriadoFisicamente) {
                  const diaVenc = parseInt(aluno.vencimento) || 5;
                  const dataVencStr = `${ano}-${String(indexMes + 1).padStart(2, '0')}-${String(diaVenc).padStart(2, '0')}`;
                  const dataVencObj = new Date(`${dataVencStr}T12:00:00`);
                  dataVencObj.setHours(0,0,0,0);

                  let statusInicial = 'pendente';
                  if (hojeObj > dataVencObj) statusInicial = 'atrasado';

                  missingMensalidades.push({
                      aluno_id: aluno.id,
                      tipo: 'mensalidade',
                      descricao: `Mensalidade Escolar - ${nomeMes}/${ano}`,
                      mes_referencia: nomeMes,
                      valor_total: clean(aluno.valor) || valorBaseVigente,
                      valor_pago: 0,
                      status: statusInicial,
                      data_pagamento: dataVencStr,
                      data_vencimento: dataVencStr,
                      detalhes_metodos: {}
                  });
              }
          });
      });

      if (missingMensalidades.length > 0) {
          for (let i = 0; i < missingMensalidades.length; i += 500) {
              await supabase.from('historico_pagamentos').insert(missingMensalidades.slice(i, i + 500));
          }
          const { data: pgtosRefetch } = await supabase.from('historico_pagamentos')
            .select('*')
            .in('tipo', ['mensalidade', 'acordo'])
            .neq('status', 'cancelado')
            .neq('status', 'estornado');
          historicoCompleto = pgtosRefetch || [];
      }

      // --- FILTRO: Excluir da visão as que viraram Acordo ('renegociado') ---
      const pgtosDesteMes = historicoCompleto.filter((p: any) => {
          if (p.tipo !== 'mensalidade') return false;
          if (p.status === 'renegociado') return false; // Trava de Ocultação
          const ref = extrairMesAnoInteligente(p, ano);
          return ref.mes === nomeMesReferencia && ref.ano === ano;
      });
      
      const acordosDesteMes = historicoCompleto.filter((p: any) => {
        const isAcordo = p.tipo === 'acordo';
        // Procura se o acordo é atrelado ao mês filtrado na descrição
        const isRefAoMes = p.descricao && p.descricao.toLowerCase().includes(nomeMesReferencia);
        const isAvulso = p.mes_referencia === 'Avulso';
        return isAcordo && isRefAoMes && !isAvulso;
      });

      if (listaAlunos) {
        const ordenados = listaAlunos.map((aluno: any) => {
          const chaveBusca = `${aluno.id}_${nomeMesReferencia}_${ano}`;
          const jaPagouNoCaderninho = mesesPagos.has(chaveBusca);

          const pgtoMensalidade = pgtosDesteMes.find((p: any) => p.aluno_id === aluno.id);
          const acuerdoAluno = acordosDesteMes.find((a: any) => a.aluno_id === aluno.id && a.status !== 'pago');
          
          let valorBaseMensalidade = clean(aluno.valor) || valorBaseVigente;
          let valorDevidoMensalidade = valorBaseMensalidade;
          let statusFinal = 'pendente';
          let nomeTags = [];

          if (jaPagouNoCaderninho && !acuerdoAluno) {
              statusFinal = 'pago';
              valorDevidoMensalidade = 0;
          } 
          else if (pgtoMensalidade) {
              if (pgtoMensalidade.status === 'parcial') {
                  statusFinal = 'parcial';
                  valorDevidoMensalidade = Math.max(0, valorBaseMensalidade - clean(pgtoMensalidade.valor_pago));
                  nomeTags.push(`⏳ Parcial (-R$ ${clean(pgtoMensalidade.valor_pago).toFixed(2)})`);
              } else {
                  const diaVenc = parseInt(aluno.vencimento) || 5;
                  const dataVencObj = new Date(parseInt(ano), parseInt(mes) - 1, diaVenc);
                  dataVencObj.setHours(0,0,0,0);
                  
                  if (hojeObj > dataVencObj) {
                      statusFinal = 'atrasado';
                  }
              }
          }

          let temAcordoNoMes = !!acordosDesteMes.find((a: any) => a.aluno_id === aluno.id);
          let isAcordoPendente = temAcordoNoMes && (!acuerdoAluno || acuerdoAluno.status !== 'pago');
          let valorParcelaAcordo = acuerdoAluno ? clean(acuerdoAluno.valor_total) : 0;
          if (acuerdoAluno && acuerdoAluno.status === 'parcial') {
              valorParcelaAcordo = Math.max(0, valorParcelaAcordo - clean(acuerdoAluno.valor_pago));
          }
          let idPagamentoAcordo = acuerdoAluno ? acuerdoAluno.id : null;

          let valorTotalDevido = 0;

          if (statusFinal !== 'pago' && statusFinal !== 'renegociado' && valorDevidoMensalidade > 0) {
              valorTotalDevido += valorDevidoMensalidade;
          }
          
          if (isAcordoPendente && valorParcelaAcordo > 0) {
              valorTotalDevido = valorParcelaAcordo; // Se tem acordo, o valor devido que aparece na tabela é apenas da parcela do acordo
              nomeTags.push(`📌 Acordo R$ ${valorParcelaAcordo.toFixed(2)}`);
              statusFinal = 'acordo';
          } else if (temAcordoNoMes && !isAcordoPendente) {
              nomeTags.push(`✅ Acordo Pago`); 
              statusFinal = 'pago'; // Zera o débito e joga pra pago se ele quitou o acordo
          }

          let nomeExibicao = nomeTags.length > 0 ? `${aluno.nome} (${nomeTags.join(' | ')})` : aluno.nome;

          return {
            ...aluno,
            status: statusFinal,
            valor: valorTotalDevido > 0 ? valorTotalDevido : valorBaseMensalidade,
            nome: nomeExibicao,
            isAcordo: isAcordoPendente, 
            idPagamentoAcordo: idPagamentoAcordo,
            valorParcelaAcordo: valorParcelaAcordo,
            isMensalidadePendente: statusFinal !== 'pago' && statusFinal !== 'acordo',
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

  const ordemHierarquicaTurmas = ["maternal", "jardim i", "jardim 1", "jardim ii", "jardim 2", "1º ano", "2º ano", "3º ano", "4º ano", "5º ano"];
  const obterPesoPedagogico = (turmaNome: string) => {
    const nomeMinusculo = (turmaNome || "").toLowerCase().trim();
    const index = ordemHierarquicaTurmas.findIndex(t => nomeMinusculo.includes(t));
    return index === -1 ? 999 : index;
  };

  const listaTurmasUnicas = Array.from(new Set(alunos.map((aluno: any) => aluno.turma).filter((t: any) => !!t)))
    .sort((a: any, b: any) => {
      const pesoA = obterPesoPedagogico(a as string);
      const pesoB = obterPesoPedagogico(b as string);
      if (pesoA !== pesoB) return pesoA - pesoB;
      return (a as string).localeCompare(b as string, "pt-BR");
    });

  const alunosFiltrados = alunos.filter((aluno: any) => {
    const nomeLimpo = removerAcentos(aluno.nome?.toLowerCase());
    const buscaLimpa = removerAcentos(filtroNome.toLowerCase());
    
    const correspondeNome = nomeLimpo.includes(buscaLimpa);
    const correspondeTurma = filtroTurma === "" || aluno.turma === filtroTurma;
    return correspondeNome && correspondeTurma;
  });

  const toggleEditValorPadrao = async () => {
    if (!editandoValor) {
      if (prompt("Digite a Senha Mestra para desbloquear a mensalidade base:") === SENHA_MESTRA) {
        setEditandoValor(true);
      } else {
        alert("Senha incorreta!");
      }
    } else {
      setEditandoValor(false);
      localStorage.setItem('valorPadraoMensalidade', valorPadrao.toString());
      
      try {
        setCarregando(true);
        const { data: listaAlunosBD } = await supabase.from('alunos').select('id, valor');
        const alunosSemValorFixo = listaAlunosBD?.filter(a => !a.valor || clean(a.valor) === 0).map(a => a.id) || [];
        
        if (alunosSemValorFixo.length > 0) {
            const [ano, mes] = mesFiltro.split('-');
            const nomeMesRef = mesesAno[parseInt(mes) - 1];
            
            await supabase.from('historico_pagamentos')
                .update({ valor_total: valorPadrao })
                .eq('tipo', 'mensalidade')
                .ilike('descricao', `%${nomeMesRef}%${ano}%`)
                .in('status', ['pendente', 'atrasado'])
                .in('aluno_id', alunosSemValorFixo);
        }
      } catch (error) {
        console.error("Erro ao atualizar no banco", error);
      }
      
      window.dispatchEvent(new Event('recarregarBalançoGlobal'));
      carregarDados();
    }
  };

  const executarDesfazer = async (linha: any) => {
      const idAlunoSelecionado = linha.id;
      if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a administração master pode desfazer registros salvos.");
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
           if(!confirm("Tem certeza que deseja estornar? A cobrança não será apagada, voltará para PENDENTE e o saldo virtual será recalculado.")) return;
      }

      let variacaoCredito = 0;
      let idsExcluidos: string[] = []; 
      const hoje = new Date();
      
      if (acao === 'mensalidade') {
           const { data: mensalidadesTodas } = await supabase.from('historico_pagamentos').select('*')
               .eq('aluno_id', idAlunoSelecionado)
               .eq('tipo', 'mensalidade');
               
           const mensalidades = (mensalidadesTodas || []).filter((m: any) => {
               const ref = extrairMesAnoInteligente(m, ano);
               return ref.mes === nomeMesRef.toLowerCase() && ref.ano === ano;
           });
               
           if (mensalidades && mensalidades.length > 0) {
               for (const m of mensalidades) {
                   idsExcluidos.push(String(m.id));
                   
                   variacaoCredito += clean(m.detalhes_metodos?.credito_aluno);
                   const parciais = m.detalhes_metodos?.historico_parciais || [];
                   parciais.forEach((p: any) => { 
                     variacaoCredito += clean(p.credito_utilizado) + clean(p.credito_utilizado_nesta_parcela); 
                   });

                   const dataVenc = new Date(`${m.data_vencimento || m.vencimento || m.data_pagamento}T12:00:00`);
                   const statusCorreto = hoje > dataVenc ? 'atrasado' : 'pendente';

                   await supabase.from('historico_pagamentos').update({
                       status: statusCorreto,
                       valor_pago: 0,
                       detalhes_metodos: {}
                   }).eq('id', m.id);
               }
           }
           await supabase.from('alunos').update({ status: 'pendente' }).eq('id', idAlunoSelecionado);
           
      } else {
           const { data: acuerdo } = await supabase.from('historico_pagamentos').select('*').eq('id', alunoObj.idPagamentoAcordo).single();
           if (acuerdo) {
               idsExcluidos.push(String(acuerdo.id));
               variacaoCredito += clean(acuerdo.detalhes_metodos?.credito_aluno);
               
               const parciais = acuerdo.detalhes_metodos?.historico_parciais || [];
               parciais.forEach((p: any) => { 
                 variacaoCredito += clean(p.credito_utilizado) + clean(p.credito_utilizado_nesta_parcela); 
               });
               
               await supabase.from('historico_pagamentos').update({ 
                 status: 'pendente', 
                 valor_pago: 0, 
                 detalhes_metodos: {} 
               }).eq('id', alunoObj.idPagamentoAcordo);
           }
      }

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
                  const descLower = (c.descricao || "").toLowerCase();
                  if (acao === 'mensalidade' && descLower.includes(nomeMesRef.toLowerCase()) && descLower.includes('troco')) return true;
                  return false;
              });

              if (creditosParaDeletar.length > 0) {
                  for (const cg of creditosParaDeletar) {
                      variacaoCredito -= clean(cg.valor_total);
                  }
                  await supabase.from('historico_pagamentos').delete().in('id', creditosParaDeletar.map((cg: any) => cg.id));
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
      
      window.dispatchEvent(new Event('recarregarBalançoGlobal'));
      carregarDados();
  }

  const avatarColors = [
    'bg-blue-100 text-blue-600',
    'bg-purple-100 text-purple-600',
    'bg-rose-100 text-rose-600',
    'bg-emerald-100 text-emerald-600',
    'bg-amber-100 text-amber-600'
  ];

  if (carregando && !alunos.length) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse text-xs md:text-base">Sincronizando base financeira...</div>;

  return (
    <div className="w-full relative space-y-6 bg-slate-50 min-h-screen p-4 md:p-8 font-sans">

      {/* CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
             <CreditCard className="text-indigo-600" size={24} />
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Valor a receber</span>
             <span className="text-xl font-black text-slate-800 leading-none">R$ {valReceber.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
             <div className="flex items-center gap-1.5 mt-2">
               <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
               <span className="text-[10px] font-semibold text-slate-500">{aReceberArr.length} cobranças em aberto</span>
             </div>
           </div>
        </div>

        <div className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
             <CheckCircle2 className="text-emerald-500" size={24} />
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Recebidos no mês</span>
             <span className="text-xl font-black text-slate-800 leading-none">R$ {valRecebidos.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
             <div className="flex items-center gap-1.5 mt-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
               <span className="text-[10px] font-semibold text-slate-500">{pagosArr.length} pagamentos</span>
             </div>
           </div>
        </div>

        <div className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
             <Clock className="text-rose-500" size={24} />
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Atrasados</span>
             <span className="text-xl font-black text-slate-800 leading-none">R$ {valAtrasados.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
             <div className="flex items-center gap-1.5 mt-2">
               <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
               <span className="text-[10px] font-semibold text-slate-500">{atrasadosArr.length} mensalidades</span>
             </div>
           </div>
        </div>

        <div className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
             <Percent className="text-amber-500" size={24} />
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Taxa de recebimento</span>
             <span className="text-xl font-black text-slate-800 leading-none">{taxaRecebimento}%</span>
             <div className="flex items-center gap-1.5 mt-2">
               <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
               <span className="text-[10px] font-semibold text-slate-500">Este mês</span>
             </div>
           </div>
        </div>
      </div>

      {/* ÁREA DA TABELA */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
        
        {/* HEADER DA TABELA */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-6 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-indigo-600" size={24} />
            <h2 className="text-lg font-black text-slate-800">Lista de Mensalidades</h2>
          </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar aluno..." 
              value={filtroNome} 
              onChange={(e) => setFiltroNome(e.target.value)} 
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all" 
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            
            <div className={`flex flex-col justify-center px-4 py-1.5 border rounded-xl transition-all h-[44px] min-w-[160px] bg-indigo-50/50 border-indigo-100 ${editandoValor ? 'bg-white border-indigo-400 ring-2 ring-indigo-500/20' : ''}`}>
              <div className="flex items-center gap-2 text-sm font-black text-indigo-900 leading-none">
                <button 
                  onClick={toggleEditValorPadrao} 
                  className="text-indigo-600 hover:text-indigo-800 transition-colors outline-none flex items-center justify-center shrink-0"
                  title={editandoValor ? "Salvar" : "Editar Valor Base"}
                >
                  {editandoValor ? "💾" : <Wallet size={15} strokeWidth={2.5} />}
                </button>
                <div className="flex items-center gap-1">
                  <span className="translate-y-[1px]">R$</span>
                  <input 
                    type="number" 
                    value={valorPadrao} 
                    disabled={!editandoValor} 
                    onChange={(e) => setValorPadrao(Number(e.target.value))} 
                    className="w-12 bg-transparent border-none outline-none p-0 disabled:opacity-100 disabled:text-indigo-900 text-indigo-900 focus:ring-0 translate-y-[1px]" 
                  />
                </div>
              </div>
              <span className="text-[8px] font-bold text-indigo-400/90 uppercase tracking-widest mt-0.5 ml-6">Valor da mensalidade</span>
            </div>
            
            <select
              value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 outline-none focus:border-indigo-400 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <option value="">Todas as turmas</option>
              {listaTurmasUnicas.map((turma: any) => (
                <option key={turma as string} value={turma as string}>{(turma as string)}</option>
              ))}
            </select>

            <div className="relative w-full sm:w-auto">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 outline-none focus:border-indigo-400 hover:bg-slate-100 transition-colors cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

        {/* TABELA EM SI */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="p-5 pl-8 w-[35%]">ALUNO</th>
                <th className="p-5 w-[20%]">TURMA</th>
                <th className="p-5 w-[15%]">VALOR / VENC.</th>
                <th className="p-5 w-[15%]">STATUS</th>
                <th className="p-5 w-[15%] text-center">AÇÕES</th>
              </tr>
            </thead>
            
            <tbody className="text-sm divide-y divide-slate-50">
              {alunosFiltrados.length > 0 ? (
                alunosFiltrados.map((aluno: any, index: number) => {
                  const isPago = aluno.status === 'pago';
                  const isAtrasado = aluno.status === 'atrasado';
                  const isAcordo = aluno.status === 'acordo';
                  const isParcial = aluno.status === 'parcial';

                  const colorClass = avatarColors[index % avatarColors.length];

                  return (
                    <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors group">
                      
                      <td className="p-4 pl-8">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-base shrink-0 ${colorClass}`}>
                            {aluno.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col max-w-[250px] truncate">
                            <span className="font-bold text-slate-800 truncate" title={aluno.nome}>{aluno.nome}</span>
                            <span className="text-xs text-slate-400 mt-0.5">{aluno.turma || "Sem Etapa"}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700 text-sm">{aluno.turma || "Não definida"}</span>
                          <span className="text-xs text-slate-400 mt-0.5">Manhã</span>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-sm">R$ {aluno.valor.toFixed(2)}</span>
                          <span className="text-xs text-slate-400 mt-0.5 font-medium">Venc. dia {aluno.vencimento?.padStart(2, '0') || '05'}/{mesFiltro.split('-')[1]}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          isPago ? "bg-emerald-50 text-emerald-600" :
                          isAtrasado ? "bg-rose-50 text-rose-600" :
                          isParcial ? "bg-sky-50 text-sky-600" :
                          isAcordo ? "bg-purple-50 text-purple-600" :
                          "bg-amber-50 text-amber-600"
                        }`}>
                          {isAtrasado && <Clock size={12} strokeWidth={3} />}
                          {isPago && <CheckCircle2 size={12} strokeWidth={3} />}
                          {(!isAtrasado && !isPago) && <AlertCircle size={12} strokeWidth={3} />}
                          {aluno.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {isPago ? (
                            <button onClick={() => executarDesfazer(aluno)} className="px-4 py-2 text-[11px] font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors w-[85px] flex justify-center">
                              Desfazer
                            </button>
                          ) : (
                            <>
                              <button onClick={() => window.open(`/admin/pdv?alunoId=${aluno.id}`, '_blank', 'noopener,noreferrer')} className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-black bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-[0_2px_10px_rgba(37,99,235,0.2)] transition-all active:scale-95 w-[85px] justify-center">
                                <CreditCard size={14} /> Pagar
                              </button>
                              <button onClick={() => {
                                 const msg = `Olá! Passando para lembrar que a mensalidade escolar de *${aluno.nome}*, referente a *${mesReferencia}*, venceu no dia *${aluno.vencimento}*.\n\n• *Valor:* R$ ${aluno.valor || valorPadrao}\n\nCaso já tenha realizado o pagamento, por favor, nos envie o comprovante para darmos a baixa no sistema. \n\nTenha um excelente dia! ✨`;
                                 window.open(`https://wa.me/55${aluno.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                              }} className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-black bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-[0_2px_10px_rgba(16,185,129,0.2)] transition-all active:scale-95 w-[85px] justify-center">
                                <MessageCircle size={14} /> Cobrar
                              </button>
                            </>
                          )}
                          <button className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-1 shrink-0">
                             <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 italic text-sm">
                    Nenhum aluno encontrado para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* RODAPÉ E PAGINAÇÃO */}
        <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-t border-slate-100 bg-white gap-4">
           <span className="text-xs font-semibold text-slate-500">
             Mostrando 1 a {alunosFiltrados.length > 6 ? 6 : alunosFiltrados.length} de {alunosFiltrados.length} mensalidades
           </span>
           <div className="flex items-center gap-1.5">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 font-bold transition-colors">&lt;</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-black">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold transition-colors">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold transition-colors">3</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold transition-colors">&gt;</button>
           </div>
        </div>

      </div>
    </div>
  );
}