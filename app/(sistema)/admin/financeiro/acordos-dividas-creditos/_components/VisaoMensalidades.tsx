"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { removerAcentos } from "@/lib/utils"; 

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
  const router = useRouter();
  const [valorPadrao, setValorPadrao] = useState(550);
  const [editandoValor, setEditandoValor] = useState(false);
  const [inicializado, setInicializado] = useState(false);
  
  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroTurma, setFiltroTurma] = useState(""); 
  const [alunos, setAlunos] = useState<any[]>([]);
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

      const pgtosDesteMes = historicoCompleto.filter((p: any) => {
          if (p.tipo !== 'mensalidade') return false;
          const ref = extrairMesAnoInteligente(p, ano);
          return ref.mes === nomeMesReferencia && ref.ano === ano;
      });
      
      const acordosDesteMes = historicoCompleto.filter((p: any) => {
        const isAcordo = p.tipo === 'acordo';
        const isNoMesFiltro = p.data_pagamento && p.data_pagamento.startsWith(mesFiltro);
        const isAvulso = p.mes_referencia === 'Avulso';
        return isAcordo && isNoMesFiltro && !isAvulso;
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

          if (jaPagouNoCaderninho) {
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

          if (statusFinal !== 'pago' && valorDevidoMensalidade > 0) {
              valorTotalDevido += valorDevidoMensalidade;
          }
          
          if (isAcordoPendente && valorParcelaAcordo > 0) {
              valorTotalDevido += valorParcelaAcordo;
              nomeTags.push(`📌 Acordo R$ ${valorParcelaAcordo.toFixed(2)}`);
              statusFinal = 'acordo';
          } else if (temAcordoNoMes && !isAcordoPendente) {
              nomeTags.push(`✅ Acordo Pago`); 
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
      const pesoA = obterPesoPedagogico(a);
      const pesoB = obterPesoPedagogico(b);
      if (pesoA !== pesoB) return pesoA - pesoB;
      return a.localeCompare(b, "pt-BR");
    });

  const alunosFiltrados = alunos.filter((aluno: any) => {
    const nomeLimpo = removerAcentos(aluno.nome?.toLowerCase());
    const buscaLimpa = removerAcentos(filtroNome.toLowerCase());
    
    const correspondeNome = nomeLimpo.includes(buscaLimpa);
    const correspondeTurma = filtroTurma === "" || aluno.turma === filtroTurma;
    return correspondeNome && correspondeTurma;
  });

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
      carregarDados();
  }

  if (carregando) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse text-xs md:text-base">Sincronizando base financeira...</div>;

  return (
    <div className="w-full relative space-y-4 md:space-y-6">
      <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">🏫 Mensalidades</h1>
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Gestão de Recebimentos e Baixas Operacionais</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full md:w-auto">
          <div className={`flex items-center justify-between sm:justify-start border rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 shadow-sm transition-all h-[38px] md:h-[44px] ${editandoValor ? 'bg-white border-indigo-400 ring-2 ring-indigo-500/20' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center">
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
                className="text-xs md:text-sm mr-2 opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
              >
                {editandoValor ? "💾" : "🔒"}
              </button>
              <div className="flex items-center gap-1">
                <span className="text-[10px] md:text-xs font-bold text-slate-400">R$</span>
                <input 
                  type="number" 
                  value={valorPadrao} 
                  disabled={!editandoValor} 
                  onChange={(e) => setValorPadrao(Number(e.target.value))} 
                  className="w-10 md:w-12 bg-transparent border-none text-xs md:text-sm font-black text-slate-700 text-center outline-none p-0 disabled:opacity-80" 
                />
              </div>
            </div>
          </div>

          <select
            value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)}
            className="w-full sm:w-auto px-2 md:px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors text-[11px] md:text-xs uppercase tracking-wider h-[38px] md:h-[44px]"
          >
            <option value="">Todas as Turmas</option>
            {listaTurmasUnicas.map((turma: any) => (
              <option key={turma as string} value={turma as string}>{(turma as string).toUpperCase()}</option>
            ))}
          </select>
          <input
            type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}
            className="w-full sm:w-auto px-2 md:px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors text-xs md:text-sm h-[38px] md:h-[44px]"
          />
        </div>
      </div>

      <div className="bg-transparent md:bg-white rounded-2xl md:rounded-[2.5rem] md:border border-slate-100 md:shadow-sm overflow-hidden">
        
        {/* BUSCA MOBILE MAIS COMPACTA */}
        <div className="pb-3 md:hidden">
           <input type="text" placeholder="🔍 Pesquisar aluno..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-colors" />
        </div>

        <table className="w-full text-left border-collapse block md:table">
          <thead className="hidden md:table-header-group bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
            <tr>
              <th className="p-4 pl-6 w-1/3">Aluno</th>
              <th className="p-4 w-1/6">Valor / Venc.</th>
              <th className="p-4 w-1/6">Status</th>
              <th className="p-4 w-1/4 text-center">Ações</th>
            </tr>
          </thead>
          
          <tbody className="block md:table-row-group text-sm">
            {alunosFiltrados.length > 0 ? (
              alunosFiltrados.map((aluno: any) => {
                const isPago = aluno.status === 'pago';
                const isAtrasado = aluno.status === 'atrasado';
                const isAcordo = aluno.status === 'acordo';
                const isParcial = aluno.status === 'parcial';

                return (
                  // Grelha Compacta no Mobile (Lista Limpa), Linha padrão no Desktop
                  <tr key={aluno.id} className="grid grid-cols-2 gap-y-1 gap-x-2 p-3 md:p-0 md:table-row bg-white border border-slate-100 md:border-none rounded-xl md:rounded-none mb-2.5 md:mb-0 md:border-b hover:bg-slate-50/40 transition-colors last:border-b-0 shadow-sm md:shadow-none">
                    
                    {/* Aluno & Turma */}
                    <td className="col-span-2 md:table-cell md:p-4 md:pl-6 pb-1 md:pb-4 border-b border-slate-50 md:border-none">
                      <div className="font-bold text-slate-800 cursor-pointer hover:text-blue-600 truncate text-[13px] md:text-[15px] leading-tight">{aluno.nome}</div>
                      <div className="text-[10px] md:text-xs text-slate-400 mt-0.5 font-medium">{aluno.turma || "Sem Turma"}</div>
                    </td>
                    
                    {/* Valor & Vencimento */}
                    <td className="col-span-1 flex flex-col justify-center pt-1 md:pt-4 md:table-cell md:p-4">
                      <div className="font-black text-slate-700 text-[12px] md:text-sm">R$ {aluno.valor.toFixed(2)}</div>
                      <div className="text-[9px] md:text-xs text-slate-400 font-bold mt-0.5">Venc. Dia {aluno.vencimento?.padStart(2, '0') || '05'}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="col-span-1 flex items-center justify-end pt-1 md:pt-4 md:table-cell md:p-4 md:justify-start">
                      <span className={`inline-flex px-1.5 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest ${
                        isPago ? "bg-emerald-100 text-emerald-700" :
                        isAtrasado ? "bg-rose-100 text-rose-700" :
                        isParcial ? "bg-sky-100 text-sky-700" :
                        isAcordo ? "bg-purple-100 text-purple-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {aluno.status}
                      </span>
                    </td>

                    {/* Ações (Botões Lado a Lado no Mobile) */}
                    <td className="col-span-2 mt-1 md:mt-0 md:table-cell md:p-4 md:text-center">
                      <div className="flex flex-row gap-2 justify-start md:justify-center w-full md:w-auto">
                        {isPago ? (
                          <button onClick={() => executarDesfazer(aluno)} className="flex-1 md:flex-none px-2 py-1.5 md:py-2 md:px-3 text-[10px] md:text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">🔄 Desfazer</button>
                        ) : (
                          <>
                            <button onClick={() => router.push(`/admin/pdv?alunoId=${aluno.id}`)} className="flex-1 md:flex-none px-2 py-1.5 md:py-2 md:px-3 text-[10px] md:text-xs font-black uppercase bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all active:scale-95">💳 Pagar</button>
                            <button onClick={() => {
                               const msg = `Olá! Passando para lembrar que a mensalidade escolar de *${aluno.nome}*, referente a *${mesReferencia}*, venceu no dia *${aluno.vencimento}*.\n\n• *Valor:* R$ ${aluno.valor || valorPadrao}\n\nCaso já tenha realizado o pagamento, por favor, nos envie o comprovante para darmos a baixa no sistema. \n\nTenha um excelente dia! ✨`;
                               window.open(`https://wa.me/55${aluno.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                            }} className="flex-1 md:flex-none px-2 py-1.5 md:py-2 md:px-3 text-[10px] md:text-xs font-black uppercase bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm transition-all active:scale-95">💬 Cobrar</button>
                          </>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })
            ) : (
              <tr className="block md:table-row bg-white">
                <td colSpan={4} className="block md:table-cell p-6 text-center text-slate-400 italic text-xs md:text-sm">Nenhum aluno encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}