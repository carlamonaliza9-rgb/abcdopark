"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importação dos Modais Modularizados da pasta global de componentes
import { ModalUniforme } from "@/app/dashboard/financeiro/_components/ModalUniforme";
import { ModalTaxas } from "@/app/dashboard/financeiro/_components/ModalTaxas";
import { ModalPagamento } from "@/app/dashboard/financeiro/_components/ModalPagamento";

export default function VendasTaxasPage() {
  const router = useRouter();
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userCargo, setUserCargo] = useState<string | null>(null);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // --- HISTÓRICOS SEPARADOS ---
  const [historicoUniformes, setHistoricoUniformes] = useState<any[]>([]);
  const [historicoTaxas, setHistoricoTaxas] = useState<any[]>([]);

  // --- ESTADOS DE CONTROLE DE MODAIS ---
  const [modalUniformeAberto, setModalUniformeAberto] = useState(false);
  const [modalTaxasAberto, setModalTaxasAberto] = useState(false);
  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);

  // --- ESTADOS PARA EDIÇÃO DE LANÇAMENTOS ---
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [idPagamentoEdicao, setIdPagamentoEdicao] = useState<string | null>(null);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]); 
  const [tipoPagamento, setTipoPagamento] = useState("uniforme");
  const [descricaoOutro, setDescricaoOutro] = useState("");
  const [pagamentosMetodos, setPagamentosMetodos] = useState({ pix: "", dinheiro: "", credito: "", debito: "", multa: "" });
  const [mesReferencia, setMesReferencia] = useState("");

  const SENHA_MESTRA = "1234";
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // --- TRAVA DE SEGURANÇA ---
  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const emailAtual = user.email || "";
      setUserEmail(emailAtual);
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      setUserCargo(perfil?.cargo || null);

      const ehAutorizado = 
        emailAtual === 'carlamonaliza9@gmail.com' || 
        emailAtual === 'diretoria@abcdopark.com' || 
        perfil?.cargo === 'Admin' ||
        perfil?.cargo === 'Direção';

      if (!ehAutorizado) {
        return router.push("/dashboard");
      }
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  async function carregarDados() {
    setCarregando(true);
    try {
      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      if (listaAlunos) setAlunos(listaAlunos);

      // Carrega os históricos da tabela global de lançamentos
      const { data: pgtosExtra } = await supabase
        .from('historico_pagamentos')
        .select('*')
        .in('tipo', ['uniforme', 'livro', 'material']);

      if (pgtosExtra) {
        // Ordena por data mais recente primeiro
        pgtosExtra.sort((a, b) => new Date(b.created_at || b.data_pagamento).getTime() - new Date(a.created_at || a.data_pagamento).getTime());
        
        setHistoricoUniformes(pgtosExtra.filter(p => p.tipo === 'uniforme'));
        setHistoricoTaxas(pgtosExtra.filter(p => p.tipo === 'livro' || p.tipo === 'material'));
      }
    } catch (err) {
      console.error("Erro ao carregar dados operacionais:", err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { 
    if (!verificandoAcesso) carregarDados(); 
  }, [verificandoAcesso]);

  // --- AÇÃO: ABRIR MODAL DE EDIÇÃO CONFIGURADO ---
  function handleIniciarEdicao(pgto: any) {
    if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para alterar lançamentos salvos.");
    }

    const aluno = alunos.find(a => a.id === pgto.aluno_id);
    setAlunoSelecionado(aluno);
    setIdPagamentoEdicao(pgto.id);
    setTipoPagamento(pgto.tipo);
    setDescricaoOutro(pgto.descricao);
    setDataPagamento(pgto.data_pagamento || new Date().toISOString().split('T')[0]);
    setMesReferencia(pgto.mes_referencia || "");
    setPagamentosMetodos(pgto.detalhes_metodos || { pix: "", dinheiro: "", credito: "", debito: "", multa: "" });
    setModalPgtoAberto(true);
  }

  // --- AÇÃO: SALVAR ALTERAÇÃO DO LANÇAMENTO ---
  async function confirmarPagamento() {
    const somaPaga = Object.values(pagamentosMetodos).reduce((acc, val) => acc + (parseFloat(val as string) || 0), 0);
    if (somaPaga <= 0) return alert("Insira um valor válido de recebimento.");

    try {
      const { data: original } = await supabase.from('historico_pagamentos').select('valor_total').eq('id', idPagamentoEdicao).single();
      const valorEsperado = original?.valor_total || somaPaga;

      let status = "pago";
      if (somaPaga < valorEsperado) {
        status = somaPaga === 0 ? "pendente" : "parcial";
      }

      const dadosAtualizados = {
        descricao: descricaoOutro,
        valor_pago: somaPaga > valorEsperado ? valorEsperado : somaPaga,
        status: status,
        data_pagamento: dataPagamento,
        detalhes_metodos: pagamentosMetodos,
        mes_referencia: mesReferencia
      };

      const { error } = await supabase.from('historico_pagamentos').update(dadosAtualizados).eq('id', idPagamentoEdicao);
      if (error) throw error;

      alert("Lançamento retificado com sucesso!");
      setModalPgtoAberto(false);
      carregarDados();
    } catch (e: any) {
      alert("Erro ao atualizar registro: " + e.message);
    }
  }

  // --- AÇÃO: EXCLUSÃO PROTEGIDA ---
  async function handleExcluirRegistro(id: string) {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla possui permissão para remover faturamentos.");
    
    if (prompt("Senha Mestra para REMOVER REGISTRO:") === SENHA_MESTRA) {
      if (confirm("Confirmar exclusão definitiva deste lançamento do histórico? Os saldos correntes serão recalculados.")) {
        await supabase.from('historico_pagamentos').delete().eq('id', id);
        alert("Lançamento removido!");
        carregarDados();
      }
    } else {
      alert("Senha incorreta.");
    }
  }

  // ================= CÁLCULOS DOS GRÁFICOS ANALÍTICOS DE TAXAS =================
  const totalMaterial = historicoTaxas.filter(p => p.tipo === 'material').length;
  const pagoMaterial = historicoTaxas.filter(p => p.tipo === 'material' && p.status === 'pago').length;
  const faltamMaterial = totalMaterial - pagoMaterial;
  const pctMaterial = totalMaterial > 0 ? Math.round((pagoMaterial / totalMaterial) * 100) : 0;

  const totalLivros = historicoTaxas.filter(p => p.tipo === 'livro').length;
  const pagoLivros = historicoTaxas.filter(p => p.tipo === 'livro' && p.status === 'pago').length;
  const faltamLivros = totalLivros - pagoLivros;
  const pctLivros = totalLivros > 0 ? Math.round((pagoLivros / totalLivros) * 100) : 0;

  // ================= CÁLCULOS DO NOVO GRÁFICO DE UNIFORMES (ANUAL 2026) =================
  let totalPecasAno = 0;
  let camisasVendidas = 0;
  let inferioresVendidos = 0; // Calça, Short, Saia
  let casacosVendidos = 0;

  historicoUniformes.forEach(item => {
    const anoItem = item.data_pagamento ? item.data_pagamento.split('-')[0] : '';
    if (anoItem === '2026' || item.mes_referencia?.includes('2026')) {
      const desc = item.descricao || '';
      const matches = desc.match(/(\d+)x\s+([^,]+)/g);
      
      if (matches) {
        matches.forEach((m: string) => {
          const qtyMatch = m.match(/(\d+)x/);
          const qty = qtyMatch ? parseInt(qtyMatch[1]) : 0;
          totalPecasAno += qty;
          
          const lowercase = m.toLowerCase();
          if (lowercase.includes('camisa')) camisasVendidas += qty;
          else if (lowercase.includes('casaco')) casacosVendidos += qty;
          else inferioresVendidos += qty;
        });
      }
    }
  });

  // Normalização para tamanho máximo visual das barras (Evita quebras de layout)
  const maxPecas = Math.max(camisasVendidas, inferioresVendidos, casacosVendidos, 10);
  const hCamisas = (camisasVendidas / maxPecas) * 100;
  const hInferiores = (inferioresVendidos / maxPecas) * 100;
  const hCasacos = (casacosVendidos / maxPecas) * 100;

  if (verificandoAcesso || carregando) return <div className="p-10 text-center">Carregando controle de vendas e taxas...</div>;

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">🛍️ Vendas de Uniformes & Taxas Anuais</h1>
        <p className="text-sm text-gray-500 mt-1">Gerenciamento centralizado de faturamentos extras, apostilas e vestuário escolar</p>
      </div>

      {/* Painel Central de Ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Bloco de Uniformes com o novo gráfico analítico anual */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-xl mb-4">👕</div>
            <h3 className="text-lg font-bold text-gray-900">Venda de Uniformes Avulsos</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">Emita faturamentos de camisas, casacos e calças escolares diretamente na ficha corrente do aluno selecionado.</p>
            
            {/* GRÁFICO VISUAIS DE UNIFORMES VENDIDOS NO ANO */}
            <div className="space-y-3 border-t border-gray-100 pt-4 mb-6">
              <div className="flex justify-between items-center text-xs font-bold text-purple-950 mb-1">
                <span>📊 Peças Saídas (Letivo 2026)</span>
                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">{totalPecasAno} un. vendidas</span>
              </div>

              {/* Linha: Camisas */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-0.5">
                  <span>👕 Camisas (Padrão / Ed. Física)</span>
                  <span className="font-bold text-gray-900">{camisasVendidas} pçs</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${hCamisas}%` }}></div>
                </div>
              </div>

              {/* Linha: Peças Inferiores */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-0.5">
                  <span>👖 Inferiores (Calças / Shorts / Saias)</span>
                  <span className="font-bold text-gray-900">{inferioresVendidos} pçs</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-fuchsia-500 h-full transition-all duration-500" style={{ width: `${hInferiores}%` }}></div>
                </div>
              </div>

              {/* Linha: Casacos */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-0.5">
                  <span>🧥 Casacos de Inverno</span>
                  <span className="font-bold text-gray-900">{casacosVendidos} pçs</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${hCasacos}%` }}></div>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setModalUniformeAberto(true)}
            className="w-full p-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm transition-all"
          >
            Registrar Nova Venda
          </button>
        </div>

        {/* Bloco de Taxas Didáticas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-xl mb-4">📦</div>
            <h3 className="text-lg font-bold text-gray-900">Faturamento Geral em Lote</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">Insira cobranças anuais automáticas de Livros Didáticos e Taxas de Materiais para todos os alunos filtrados por segmento de ensino.</p>
            
            {/* GRÁFICOS VISUAIS DE PROGRESSO DE ARRECADAÇÃO */}
            <div className="space-y-4 border-t border-gray-100 pt-4 mb-6">
              {/* Progresso: Taxa de Material */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-1">
                  <span>🎨 Taxa de Material</span>
                  <span className="text-emerald-600">{pagoMaterial} de {totalMaterial} quitados ({pctMaterial}%)</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${pctMaterial}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-400 mt-0.5">
                  <span>{pagoMaterial} concluídos</span>
                  <span className="text-red-500 font-bold">{faltamMaterial} em aberto</span>
                </div>
              </div>

              {/* Progresso: Livros Didáticos */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-1">
                  <span>📘 Livros Didáticos</span>
                  <span className="text-blue-600">{pagoLivros} de {totalLivros} quitados ({pctLivros}%)</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${pctLivros}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-400 mt-0.5">
                  <span>{pagoLivros} concluídos</span>
                  <span className="text-red-500 font-bold">{faltamLivros} em aberto</span>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setModalTaxasAberto(true)}
            className="w-full p-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all"
          >
            Gerar Cobranças em Lote
          </button>
        </div>
      </div>

      {/* ================= RESUMO 1: HISTÓRICO DE UNIFORMES ================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-5 border-b border-gray-100 bg-purple-50/30">
          <h3 className="font-bold text-purple-950 text-sm uppercase tracking-wider">🛒 Histórico de Venda de Uniformes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider">
                <th className="p-4">Data</th>
                <th className="p-4">Aluno</th>
                <th className="p-4">Itens / Descrição</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {historicoUniformes.length > 0 ? (
                historicoUniformes.map((item) => {
                  const nomeAluno = alunos.find(a => a.id === item.aluno_id)?.nome || "Aluno Não Encontrado";
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-gray-500 font-medium">
                        {item.data_pagamento ? new Date(item.data_pagamento + "T12:00:00").toLocaleDateString('pt-BR') : '--'}
                      </td>
                      <td className="p-4 font-bold text-gray-900 uppercase">{nomeAluno}</td>
                      <td className="p-4 text-gray-600">{item.descricao}</td>
                      <td className="p-4 text-right font-black text-gray-900">R$ {parseFloat(item.valor_total).toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          item.status === 'pago' ? 'bg-emerald-50 text-emerald-700' : item.status === 'parcial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-2">
                        <button onClick={() => handleIniciarEdicao(item)} className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg font-bold hover:bg-blue-100">✏️ Editar</button>
                        <button onClick={() => handleExcluirRegistro(item.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg font-bold hover:bg-red-100">🗑️ Eliminar</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={6} className="p-6 text-center text-gray-400 italic">Nenhuma venda de uniforme registada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= RESUMO 2: HISTÓRICO DE TAXAS ANUAIS ================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-5 border-b border-gray-100 bg-emerald-50/30">
          <h3 className="font-bold text-emerald-950 text-sm uppercase tracking-wider">📦 Histórico de Lançamento de Taxas Letivas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider">
                <th className="p-4">Período</th>
                <th className="p-4">Aluno</th>
                <th className="p-4">Tipo de Obrigação</th>
                <th className="p-4 text-right">Valor Faturado</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {historicoTaxas.length > 0 ? (
                historicoTaxas.map((item) => {
                  const nomeAluno = alunos.find(a => a.id === item.aluno_id)?.nome || "Aluno Não Encontrado";
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-gray-500 font-bold">{item.mes_referencia}</td>
                      <td className="p-4 font-bold text-gray-900 uppercase">{nomeAluno}</td>
                      <td className="p-4 text-gray-600 uppercase font-semibold">
                        {item.tipo === 'livro' ? '📘 Livros Didáticos' : '🎨 Material Escolar Anual'}
                      </td>
                      <td className="p-4 text-right font-black text-gray-900">R$ {parseFloat(item.valor_total).toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          item.status === 'pago' ? 'bg-emerald-50 text-emerald-700' : item.status === 'parcial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-2">
                        <button onClick={() => handleIniciarEdicao(item)} className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg font-bold hover:bg-blue-100">✏️ Editar</button>
                        <button onClick={() => handleExcluirRegistro(item.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg font-bold hover:bg-red-100">🗑️ Eliminar</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={6} className="p-6 text-center text-gray-400 italic">Nenhum faturamento em lote registado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GLOBAL DE RECEBIMENTO ADAPTADO PARA ATUALIZAÇÕES */}
      <ModalPagamento 
        aberto={modalPgtoAberto} onFechar={() => setModalPgtoAberto(false)}
        aluno={alunoSelecionado} dataPagamento={dataPagamento} setDataPagamento={setDataPagamento}
        tipoPagamento={tipoPagamento} setTipoPagamento={setTipoPagamento}
        mesReferencia={mesReferencia} setMesReferencia={setMesReferencia} mesesAno={mesesAno}
        descricaoOutro={descricaoOutro} setDescricaoOutro={setDescricaoOutro}
        pagamentosMetodos={pagamentosMetodos} setPagamentosMetodos={setPagamentosMetodos}
        onConfirmar={confirmarPagamento} editando={!!idPagamentoEdicao}
      />

      {/* MODAIS COMPLEMENTARES DE EMISSÃO */}
      <ModalUniforme aberto={modalUniformeAberto} onFechar={() => setModalUniformeAberto(false)} alunos={alunos} carregarDados={carregarDados} />
      <ModalTaxas aberto={modalTaxasAberto} onFechar={() => setModalTaxasAberto(false)} alunos={alunos} carregarDados={carregarDados} />
    </div>
  );
}