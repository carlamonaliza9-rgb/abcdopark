"use client";

import { useState, useEffect } from "react";

interface ModalPagamentoProps {
  aberto: boolean;
  onFechar: () => void;
  aluno: any;
  dataPagamento: string;
  setDataPagamento: (val: string) => void;
  tipoPagamento: string;
  setTipoPagamento: (val: string) => void;
  mesReferencia: string;
  setMesReferencia: (val: string) => void;
  mesesAno: string[];
  descricaoOutro: string;
  setDescricaoOutro: (val: string) => void;
  pagamentosMetodos: any;
  setPagamentosMetodos: (val: any) => void;
  onConfirmar: () => void;
  editando: boolean;
  historicoGeral?: any[]; 
  dividasAbertas?: any[];
  onConfirmarPDV?: (dividasSelecionadas: any[]) => void;
  dividaPreSelecionada?: string | null;
}

export function ModalPagamento({
  aberto,
  onFechar,
  aluno,
  dataPagamento,
  setDataPagamento,
  tipoPagamento,
  setTipoPagamento,
  mesReferencia,
  setMesReferencia,
  mesesAno,
  descricaoOutro,
  setDescricaoOutro,
  pagamentosMetodos,
  setPagamentosMetodos,
  onConfirmar,
  editando,
  historicoGeral = [],
  dividasAbertas = [],
  onConfirmarPDV,
  dividaPreSelecionada
}: ModalPagamentoProps) {
  const [anoReferencia, setAnoReferencia] = useState(new Date().getFullYear().toString());
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>(mesesAno);
  
  const [itensCarrinho, setItensCarrinho] = useState<string[]>([]);

  useEffect(() => {
    if (aberto && tipoPagamento === "mensalidade") {
      const novaDesc = `Mensalidade - ${mesReferencia}/${anoReferencia}`;
      if (descricaoOutro !== novaDesc) {
        setDescricaoOutro(novaDesc);
      }
    }
  }, [mesReferencia, anoReferencia, tipoPagamento, aberto, descricaoOutro, setDescricaoOutro]);

  useEffect(() => {
    if (aberto && tipoPagamento === "mensalidade" && !editando) {
      const mesesPagosNoAno = (historicoGeral || [])
        .filter(h => h.descricao && h.descricao.includes(anoReferencia) && h.status === 'pago')
        .map(h => h.mes_referencia);
      
      const disponiveis = mesesAno.filter(m => !mesesPagosNoAno.includes(m));
      
      if (JSON.stringify(disponiveis) !== JSON.stringify(mesesDisponiveis)) {
        setMesesDisponiveis(disponiveis);
      }
      
      if (!disponiveis.includes(mesReferencia) && disponiveis.length > 0) {
        if (mesReferencia !== disponiveis[0]) setMesReferencia(disponiveis[0]);
      }
    } else {
      if (mesesDisponiveis.length !== 12) setMesesDisponiveis(mesesAno);
    }
  }, [aberto, anoReferencia, tipoPagamento, editando, mesReferencia, mesesAno, historicoGeral, mesesDisponiveis, setMesReferencia]);

  useEffect(() => {
    if (aberto) {
      if (tipoPagamento === "pdv" && dividaPreSelecionada) {
        setItensCarrinho([dividaPreSelecionada]);
      } else {
        setItensCarrinho([]);
      }
    }
  }, [aberto, tipoPagamento, dividaPreSelecionada]);

  if (!aberto) return null;

  // LÓGICA MATEMÁTICA INTELIGENTE (Tempo Real)
  const cleanNum = (val: any) => parseFloat(String(val).replace(',', '.')) || 0;

  const valorCartaoCredito = cleanNum(pagamentosMetodos.cartao_credito ?? pagamentosMetodos.credito);
  const valorCartaoCreditoEditora = cleanNum(pagamentosMetodos.cartao_credito_editora ?? pagamentosMetodos.credito_editora);
  const temValorNoCredito = valorCartaoCredito > 0 || valorCartaoCreditoEditora > 0;

  const somaValoresRecebidos = 
    cleanNum(pagamentosMetodos.pix) + 
    cleanNum(pagamentosMetodos.dinheiro) + 
    cleanNum(pagamentosMetodos.cartao_debito ?? pagamentosMetodos.debito) + 
    cleanNum(pagamentosMetodos.boleto) + 
    cleanNum(pagamentosMetodos.credito_aluno) + 
    cleanNum(pagamentosMetodos.pix_editora) + 
    cleanNum(pagamentosMetodos.cartao_debito_editora ?? pagamentosMetodos.debito_editora) +
    valorCartaoCredito + valorCartaoCreditoEditora;

  const totalDesconto = cleanNum(pagamentosMetodos.desconto);
  const totalMulta = cleanNum(pagamentosMetodos.multa);

  // Calcula quanto das dívidas selecionadas está em aberto (Alvo Inicial)
  const dividasSelecionadasObjetos = dividasAbertas.filter(d => itensCarrinho.includes(d.id));
  const valorTotalCarrinho = dividasSelecionadasObjetos.reduce((acc, d) => acc + ((parseFloat(d.valor_total) || 0) - (parseFloat(d.valor_pago) || 0)), 0);
  
  // Dívida Líquida Real = (Soma das Faturas Selecionadas - Descontos) + Multas Adicionadas
  const totalDevidoAjustado = valorTotalCarrinho > 0 ? (valorTotalCarrinho - totalDesconto + totalMulta) : 0;
  
  // Balança Final (Positivo = Troco/Crédito | Negativo = Falta/Parcial)
  const saldoDiferenca = somaValoresRecebidos - totalDevidoAjustado;
  
  // Margem de erro de arredondamento de 0.01 centavos
  const isPagamentoParcial = somaValoresRecebidos > 0 && saldoDiferenca < -0.01;
  const temTrocoGuardar = somaValoresRecebidos > 0 && saldoDiferenca > 0.01;

  const handleToggleCarrinho = (id: string) => {
    if (itensCarrinho.includes(id)) {
      setItensCarrinho(itensCarrinho.filter(itemId => itemId !== id));
    } else {
      setItensCarrinho([...itensCarrinho, id]);
    }
  };

  const confirmarAcao = () => {
    if (tipoPagamento === 'pdv' && onConfirmarPDV) {
      if (itensCarrinho.length === 0) return alert("Selecione ao menos uma dívida para quitar.");
      if (!temValorNoCredito) {
          pagamentosMetodos.parcelas = "1";
          pagamentosMetodos.juros_cartao = "";
      }
      onConfirmarPDV(dividasSelecionadasObjetos);
    } else {
      if (!temValorNoCredito) {
          pagamentosMetodos.parcelas = "1";
          pagamentosMetodos.juros_cartao = "";
      }
      onConfirmar();
    }
  };

  const btnDesativado = tipoPagamento === 'mensalidade' && mesesDisponiveis.length === 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        
        <div className="p-6 border-b border-slate-100 flex-shrink-0 text-center">
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter italic m-0">
            {aluno?.nome || "Lançamento"}
          </h2>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fluxo de Caixa (Data)</label>
              <input 
                type="date" 
                value={dataPagamento} 
                onChange={(e) => setDataPagamento(e.target.value)} 
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none focus:border-indigo-400" 
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Categoria</label>
              <select 
                value={tipoPagamento} 
                onChange={(e) => setTipoPagamento(e.target.value)} 
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none focus:border-indigo-400"
              >
                {dividasAbertas.length > 0 && <option value="pdv">🛒 Quitar Faturas (PDV)</option>}
                <option value="mensalidade">🏫 Mensalidade Avulsa</option>
                <option value="material">🎨 Taxa de Material</option>
                <option value="livro">📘 Livros Didáticos</option>
                <option value="uniforme">👕 Uniformes Escolares</option>
                <option value="evento">🎟️ Projetos / Eventos</option>
              </select>
            </div>
          </div>

          {tipoPagamento === "pdv" ? (
            <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Faturas Localizadas:</h3>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Aberto: R$ {dividasAbertas.reduce((acc, d) => acc + ((parseFloat(d.valor_total) || 0) - (parseFloat(d.valor_pago) || 0)), 0).toFixed(2)}</span>
              </div>
              <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {dividasAbertas.map(d => {
                  const restante = (parseFloat(d.valor_total) || 0) - (parseFloat(d.valor_pago) || 0);
                  const isChecked = itensCarrinho.includes(d.id);
                  return (
                    <label key={d.id} className={`flex items-center gap-4 p-4 bg-white rounded-2xl border transition-all cursor-pointer ${isChecked ? 'border-emerald-500 shadow-sm ring-2 ring-emerald-100' : 'border-slate-200 hover:border-indigo-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => handleToggleCarrinho(d.id)} 
                        className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="block text-sm font-bold text-slate-800 leading-tight">{d.descricao}</span>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pendente: R$ {restante.toFixed(2)}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {tipoPagamento === "mensalidade" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Mês de Referência</label>
                    <select 
                      value={mesReferencia} 
                      onChange={(e) => setMesReferencia(e.target.value)} 
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700 outline-none focus:border-indigo-400"
                    >
                      {mesesDisponiveis.length > 0 ? (
                        mesesDisponiveis.map(m => (<option key={m} value={m}>{m}</option>))
                      ) : (
                        <option value="" disabled>Todos os meses quitados</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ano Letivo</label>
                    <select 
                      value={anoReferencia} 
                      onChange={(e) => setAnoReferencia(e.target.value)} 
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700 outline-none focus:border-indigo-400"
                    >
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Observações / Lançamento Fixo</label>
                <input 
                  type="text" 
                  placeholder={tipoPagamento === 'mensalidade' ? "" : "Ex: Camisa Tam M, etc."} 
                  value={descricaoOutro} 
                  onChange={(e) => setDescricaoOutro(e.target.value)} 
                  disabled={tipoPagamento === 'mensalidade'} 
                  className={`w-full px-4 py-3 rounded-2xl border font-bold outline-none transition-colors ${
                    tipoPagamento === 'mensalidade' 
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-white border-slate-200 text-slate-700 focus:border-indigo-400'
                  }`}
                />
              </div>
            </>
          )}

          <div className="bg-slate-50 p-5 md:p-6 rounded-[2rem] border border-slate-200">
            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-[0.2em] mb-4 pb-4 border-b border-slate-200">Distribuição do Pagamento (R$)</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Pix", key: "pix" },
                { label: "Dinheiro (Espécie)", key: "dinheiro" },
                { label: "Cartão de Crédito", key: "cartao_credito", alt: "credito" },
                { label: "Cartão de Débito", key: "cartao_debito", alt: "debito" },
                { label: "Boleto Bancário", key: "boleto" }
              ].map(metodo => (
                <div key={metodo.key}>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{metodo.label}</label>
                  <input 
                    type="number" 
                    step="0.01" min="0"
                    placeholder="0.00"
                    value={pagamentosMetodos[metodo.key] ?? pagamentosMetodos[metodo.alt || ""] ?? ""} 
                    onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, [metodo.key]: e.target.value, ...(metodo.alt && { [metodo.alt]: undefined }) })} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 outline-none focus:border-indigo-400 transition-colors"
                  />
                </div>
              ))}

              <div className="bg-emerald-50/50 p-3 rounded-xl border border-dashed border-emerald-300">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Usar Saldo/Crédito Virtual</label>
                <input 
                  type="number" 
                  step="0.01" min="0"
                  placeholder="0.00"
                  value={pagamentosMetodos.credito_aluno || ""} 
                  onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, credito_aluno: e.target.value })} 
                  className="w-full px-4 py-2.5 rounded-lg border border-emerald-200 bg-white font-bold text-emerald-900 outline-none focus:border-emerald-400" 
                />
              </div>

              {tipoPagamento === "livro" && (
                <>
                  <div className="col-span-1 sm:col-span-2 h-px bg-slate-200 my-2"></div>
                  {[
                    { label: "Pix Editora", key: "pix_editora" },
                    { label: "Crédito Editora", key: "cartao_credito_editora", alt: "credito_editora" },
                    { label: "Débito Editora", key: "cartao_debito_editora", alt: "debito_editora" }
                  ].map(metodo => (
                    <div key={metodo.key}>
                      <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">{metodo.label}</label>
                      <input 
                        type="number" 
                        step="0.01" min="0"
                        placeholder="0.00"
                        value={pagamentosMetodos[metodo.key] ?? pagamentosMetodos[metodo.alt || ""] ?? ""} 
                        onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, [metodo.key]: e.target.value, ...(metodo.alt && { [metodo.alt]: undefined }) })} 
                        className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 bg-white font-bold text-indigo-900 outline-none focus:border-indigo-400 transition-colors" 
                      />
                    </div>
                  ))}
                </>
              )}

              {temValorNoCredito && (
                <div className="col-span-1 sm:col-span-2 bg-blue-50/70 p-4 rounded-2xl border border-blue-200 mt-2 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest block mb-2">Parcelamento (Cartão Crédito)</label>
                      <select 
                        value={pagamentosMetodos.parcelas || "1"} 
                        onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, parcelas: e.target.value })} 
                        className="w-full px-4 py-3 rounded-xl border border-blue-300 bg-white font-black text-blue-900 outline-none focus:border-blue-500"
                      >
                        <option value="1">À vista (1x)</option>
                        {[2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x no cartão</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest block mb-2">Juros da Máquina (+ R$)</label>
                      <input 
                        type="number" 
                        step="0.01" min="0"
                        placeholder="0.00"
                        value={pagamentosMetodos.juros_cartao || ""} 
                        onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, juros_cartao: e.target.value })} 
                        className="w-full px-4 py-3 rounded-xl border border-rose-300 bg-white font-black text-rose-900 outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="col-span-1 sm:col-span-2 h-px bg-slate-200 my-2"></div>
              
              <div>
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Desconto Amigável (- R$)</label>
                <input 
                  type="number" 
                  step="0.01" min="0"
                  placeholder="0.00" 
                  value={pagamentosMetodos.desconto || ""} 
                  onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, desconto: e.target.value })} 
                  className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-white font-bold text-emerald-900 outline-none focus:border-emerald-400" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-1">Multas/Acréscimos (+ R$)</label>
                <input 
                  type="number" 
                  step="0.01" min="0"
                  placeholder="0.00" 
                  value={pagamentosMetodos.multa || ""} 
                  onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, multa: e.target.value })} 
                  className="w-full px-4 py-2.5 rounded-xl border border-rose-200 bg-white font-bold text-rose-900 outline-none focus:border-rose-400" 
                />
              </div>
            </div>

            {/* O NOVO RESUMO FINANCEIRO INTELIGENTE */}
            {tipoPagamento === "pdv" && itensCarrinho.length > 0 && (
              <div className="mt-6 bg-slate-800 p-5 rounded-2xl text-white shadow-inner animate-in fade-in slide-in-from-bottom-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-700 pb-2">Balanço Final da Transação</h4>
                
                <div className="space-y-1.5 text-sm font-semibold">
                  <div className="flex justify-between text-slate-300">
                    <span>Faturas Base ({itensCarrinho.length}):</span>
                    <span>R$ {valorTotalCarrinho.toFixed(2)}</span>
                  </div>
                  {totalDesconto > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Descontos:</span>
                      <span>- R$ {totalDesconto.toFixed(2)}</span>
                    </div>
                  )}
                  {totalMulta > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>Multas:</span>
                      <span>+ R$ {totalMulta.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-lg font-black text-white pt-2 mt-2 border-t border-slate-700">
                    <span>Total Exigido:</span>
                    <span>R$ {totalDevidoAjustado.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 pt-1">
                    <span>Valor Recebido (Inputs):</span>
                    <span>R$ {somaValoresRecebidos.toFixed(2)}</span>
                  </div>

                  {/* CAIXA DE AVISO: TROCO OU PENDÊNCIA */}
                  {isPagamentoParcial && (
                    <div className="flex justify-between text-amber-400 font-bold bg-amber-400/10 p-2.5 rounded-xl mt-3 border border-amber-400/20">
                      <span>Ainda Faltam (Status Parcial):</span>
                      <span>R$ {Math.abs(saldoDiferenca).toFixed(2)}</span>
                    </div>
                  )}
                  {temTrocoGuardar && (
                    <div className="flex justify-between text-sky-400 font-bold bg-sky-400/10 p-2.5 rounded-xl mt-3 border border-sky-400/20">
                      <span>Troco Excedente (Vai p/ Conta do Aluno):</span>
                      <span>+ R$ {saldoDiferenca.toFixed(2)}</span>
                    </div>
                  )}
                  {!isPagamentoParcial && !temTrocoGuardar && somaValoresRecebidos > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold bg-emerald-400/10 p-2.5 rounded-xl mt-3 border border-emerald-400/20">
                      <span>Conta Fechada:</span>
                      <span>Quitação Perfeita</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-4 shrink-0 bg-white rounded-b-[2.5rem]">
          <button 
            onClick={onFechar} 
            className="w-full sm:w-1/3 py-4 rounded-2xl border border-slate-200 text-slate-500 font-black uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all text-xs"
          >
            Cancelar
          </button>

          {editando ? (
              <button onClick={confirmarAcao} className="w-full sm:w-2/3 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all text-xs hover:bg-indigo-700 shadow-indigo-200">
                Atualizar Valores
              </button>
          ) : btnDesativado ? (
              <button disabled className="w-full sm:w-2/3 py-4 rounded-2xl bg-slate-300 text-white font-black uppercase tracking-widest shadow-none cursor-not-allowed text-xs">
                Ano Quitado
              </button>
          ) : (
              <button 
                onClick={confirmarAcao} 
                disabled={tipoPagamento === 'pdv' && (itensCarrinho.length === 0 || somaValoresRecebidos <= 0)}
                className={`w-full sm:w-2/3 py-4 rounded-2xl text-white font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all text-xs flex flex-col items-center justify-center leading-tight ${
                  (tipoPagamento === 'pdv' && (itensCarrinho.length === 0 || somaValoresRecebidos <= 0)) ? 'bg-slate-300 shadow-none cursor-not-allowed' :
                  isPagamentoParcial ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' :
                  temTrocoGuardar ? 'bg-sky-500 hover:bg-sky-600 shadow-sky-200' : 
                  'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
                }`}
              >
                {tipoPagamento === 'pdv' ? (
                   itensCarrinho.length === 0 ? "Selecione as Faturas" :
                   somaValoresRecebidos <= 0 ? "Insira os Valores Acima" :
                   isPagamentoParcial ? (<span>Lançar Baixa Parcial <span className="block text-[9px] opacity-80 mt-0.5">Dívida continuará aberta</span></span>) :
                   temTrocoGuardar ? (<span>Quitar e Gerar Troco <span className="block text-[9px] opacity-80 mt-0.5">+R$ {saldoDiferenca.toFixed(2)} para o aluno</span></span>) : 
                   "Confirmar Quitação"
                ) : (
                   "Confirmar Recebimento"
                )}
              </button>
          )}
        </div>

      </div>
    </div>
  );
}