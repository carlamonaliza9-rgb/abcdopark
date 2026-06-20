import React, { useState } from "react";

export function HeaderPDV({ router }: any) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-2">
      <div className="flex items-center gap-4">
        <div className="bg-indigo-100/50 p-3 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Frente de Caixa (PDV)</h1>
          <p className="text-xs text-slate-500 mt-0.5">Gerencie vendas, registre pagamentos e acompanhe o caixa em tempo real.</p>
        </div>
      </div>
      <button onClick={() => router.push('/admin/dashboard')} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-medium text-sm rounded-xl hover:bg-slate-50 shadow-sm transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> Voltar
      </button>
    </div>
  );
}

export function StatusCaixaReduzido({ caixaAtual, setModalFechamentoAberto, carregarHistoricoCaixas, setModalMovimentacao }: any) {
  if (!caixaAtual) return null;
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80 flex flex-col xl:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 leading-tight">Caixa Aberto</h4>
          <span className="text-xs text-slate-500 font-medium">Iniciado às {new Date(caixaAtual.data_abertura).toLocaleTimeString('pt-BR')} por <span className="text-indigo-600 font-semibold">{caixaAtual.operador_nome || 'Monaliza'}</span></span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setModalMovimentacao({aberto: true, tipo: 'suprimento'})} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50/50 text-emerald-600 text-xs font-bold rounded-lg border border-emerald-100 hover:bg-emerald-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          Suprimento (+) <br/>
        </button>
        <button onClick={() => setModalMovimentacao({aberto: true, tipo: 'sangria'})} className="flex items-center gap-1.5 px-4 py-2 bg-rose-50/50 text-rose-600 text-xs font-bold rounded-lg border border-rose-100 hover:bg-rose-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          Sangria (-) <br/>
        </button>
        <button onClick={() => setModalFechamentoAberto(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          Fechar Caixa
        </button>
        <button onClick={carregarHistoricoCaixas} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          Auditoria
        </button>
      </div>
    </div>
  );
}

export function IdentificacaoCliente({ alunoSelecionado, setAlunoSelecionado, buscaAluno, setBuscaAluno, alunosFiltrados, saldoAtualAluno }: any) {
  return (
    <div className="mb-2">
      {!alunoSelecionado ? (
        <div className="flex gap-4 items-center">
          <div className="relative group flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" placeholder="Buscar aluno para iniciar venda..." value={buscaAluno} onChange={(e) => setBuscaAluno(e.target.value)} 
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all shadow-sm font-medium" 
            />
            {buscaAluno && (
              <div className="absolute z-20 w-full mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-xl bg-white">
                {alunosFiltrados.map((a: any) => (
                  <div key={a.id} onClick={() => setAlunoSelecionado(a)} className="p-3.5 border-b border-slate-50 hover:bg-indigo-50/50 cursor-pointer transition-colors flex justify-between items-center group">
                    <span className="font-bold text-sm text-slate-700 group-hover:text-indigo-700">{a.nome}</span>
                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">{a.turma}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="flex items-center gap-2 px-5 py-3 text-indigo-600 bg-white font-bold text-sm rounded-xl border border-slate-200 hover:bg-slate-50 shadow-sm transition-colors whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Novo item
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-xl font-black">
              {alunoSelecionado.nome.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base leading-tight">{alunoSelecionado.nome}</h3>
              <div className="flex gap-3 mt-1">
                <span className="text-xs font-medium text-slate-500">Turma: {alunoSelecionado.turma || "N/A"}</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 rounded">
                  Saldo: R$ {saldoAtualAluno.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => setAlunoSelecionado(null)} className="text-xs bg-white border border-slate-200 text-slate-600 font-bold px-4 py-2 rounded-lg hover:text-rose-600 hover:border-rose-200 shadow-sm transition-colors">
            Trocar Aluno
          </button>
        </div>
      )}
    </div>
  );
}

export function RadarInadimplencia({ inadimplentesTop5, setAlunoSelecionado }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:col-span-2">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-50 rounded-lg">
            <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 leading-tight">Radar de Inadimplência</h3>
            <p className="text-xs text-slate-500">Alunos com maiores débitos em aberto</p>
          </div>
        </div>
        <button className="text-rose-600 text-xs font-bold bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-lg transition-colors">Ver todos</button>
      </div>
      
      <div className="space-y-3">
        {inadimplentesTop5.length > 0 ? inadimplentesTop5.map((item: any, idx: number) => {
          // Cores alternadas para os avatares para dar o aspecto visual da imagem
          const avatarColors = [
            "bg-orange-100 text-orange-600",
            "bg-rose-100 text-rose-600",
            "bg-amber-100 text-amber-600",
            "bg-red-100 text-red-600",
            "bg-pink-100 text-pink-600"
          ];
          const colorClass = avatarColors[idx % avatarColors.length];

          return (
            <div key={item.alunoRaw.id} onClick={() => setAlunoSelecionado(item.alunoRaw)} className="flex justify-between items-center p-4 bg-rose-50/30 border border-rose-100/60 rounded-xl hover:bg-rose-50 cursor-pointer transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full font-black text-sm flex items-center justify-center ${colorClass}`}>
                    {item.nome.charAt(0)}
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-slate-700">{item.nome}</span>
                    <span className="text-xs text-slate-500 font-medium mt-0.5 block">Turma: {item.alunoRaw.turma || "N/A"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-black text-rose-600 text-sm">R$ {item.total_devido.toFixed(2)}</span>
                  <svg className="w-5 h-5 text-rose-300 group-hover:text-rose-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </div>
            </div>
          );
        }) : (
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-60 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <span className="text-4xl mb-2">🏆</span>
              <p className="text-xs text-slate-500 font-medium italic">Nenhuma inadimplência<br/>registrada no momento.</p>
            </div>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        <button className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
          Ver todos os inadimplentes <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

export function CarrinhoLateral({ caixaAtual, alunoSelecionado, carrinho, removerDoCarrinho, subtotalCarrinho, setModalCaixaAberto, abrirModalCheckout }: any) {
  return (
    <div className="xl:col-span-4 relative flex flex-col">
      {!caixaAtual && alunoSelecionado && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 rounded-2xl flex flex-col items-center justify-center border border-slate-200 shadow-xl">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 text-center max-w-[85%] animate-in zoom-in-95">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">Caixa Fechado</h3>
            <p className="text-xs text-slate-500 mb-6">É necessário abrir uma sessão de caixa antes de registrar vendas ou pagamentos.</p>
            <button onClick={() => setModalCaixaAberto(true)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all">Abrir Caixa</button>
          </div>
        </div>
      )}

      <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 h-[650px] ${!caixaAtual && alunoSelecionado ? 'opacity-30 pointer-events-none' : ''}`}>
        
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-800">Resumo da Venda</h2>
          <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold">{carrinho.length} itens</span>
        </div>

        {carrinho.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center mb-6">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Carrinho vazio</h3>
            <p className="text-xs text-slate-500 text-center max-w-[200px]">Busque um aluno e adicione itens para iniciar a venda.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 mb-6">
            {carrinho.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] group hover:border-indigo-100 transition-colors">
                <div className="truncate pr-3 flex-1">
                  <span className="text-xs font-bold text-slate-700 block truncate" title={item.descricao}>{item.descricao}</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5 block">{item.tipo}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-black text-slate-800">R$ {(item.valor_total - item.valor_pago).toFixed(2)}</span>
                  <button onClick={() => removerDoCarrinho(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors w-6 h-6 flex items-center justify-center rounded">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto">
          <div className="space-y-3 border-t border-slate-100 pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500">Subtotal</span>
              <span className="text-sm font-bold text-slate-800">R$ {subtotalCarrinho.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500">Descontos</span>
              <span className="text-sm font-bold text-amber-500">R$ 0,00</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-base font-black text-indigo-600">TOTAL</span>
              <span className="text-xl font-black text-indigo-600">R$ {subtotalCarrinho.toFixed(2)}</span>
            </div>
          </div>

          <button 
            onClick={abrirModalCheckout} 
            disabled={carrinho.length === 0 || !caixaAtual} 
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 flex justify-center items-center gap-2 ${carrinho.length === 0 || !caixaAtual ? 'bg-indigo-50 text-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            Ir para pagamento
          </button>
        </div>
      </div>
    </div>
  );
}

export function AreaDeVendasComAbas({ alunoSelecionado, dividasAluno, carrinho, removerDoCarrinho, adicionarAoCarrinho, clean, novoItem, setNovoItem, uniformesTamanhos, setUniformesTamanhos, uniformesVenda, setUniformesVenda, totalVendaUniforme, lancarItemAvulsoNoCarrinho }: any) {
  const [abaAtiva, setAbaAtiva] = useState<'dividas' | 'produtos'>('dividas');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-[565px] animate-in slide-in-from-bottom-4">
      <div className="flex border-b border-slate-200 bg-slate-50/50">
        <button onClick={() => setAbaAtiva('dividas')} className={`flex-1 py-4 text-sm font-bold tracking-wide uppercase transition-all border-b-2 ${abaAtiva === 'dividas' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
          Débitos em Aberto
        </button>
        <button onClick={() => setAbaAtiva('produtos')} className={`flex-1 py-4 text-sm font-bold tracking-wide uppercase transition-all border-b-2 ${abaAtiva === 'produtos' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
          Catálogo / Avulso
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/30">
        {abaAtiva === 'dividas' && (
          <div className="space-y-3 animate-in fade-in">
            {dividasAluno.length > 0 ? dividasAluno.map((div: any) => {
              const devedor = clean(div.valor_total) - clean(div.valor_pago);
              const noCarrinho = carrinho.find((c:any) => c.id === div.id);
              if (devedor <= 0) return null;
              
              return (
                <div key={div.id} className={`p-4 rounded-xl border flex justify-between items-center transition-all duration-200 ${noCarrinho ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <div>
                    <span className="block text-sm font-bold text-slate-800">{div.descricao}</span>
                    <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">Vencimento: {new Date(div.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-rose-600">R$ {devedor.toFixed(2)}</span>
                    <button onClick={() => noCarrinho ? removerDoCarrinho(div.id) : adicionarAoCarrinho(div)} className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${noCarrinho ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {noCarrinho ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                <span className="text-4xl mb-3">✅</span>
                <p className="text-sm text-slate-500 font-bold">Cliente sem pendências financeiras.</p>
              </div>
            )}
          </div>
        )}

        {abaAtiva === 'produtos' && (
          <div className="space-y-5 animate-in fade-in">
            <select value={novoItem.tipo} onChange={(e) => setNovoItem({...novoItem, tipo: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-sm">
              <option value="uniforme">Uniformes (Grade)</option>
              <option value="material">Material Avulso</option>
              <option value="outros">Taxas Diversas</option>
            </select>

            {novoItem.tipo === 'uniforme' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[ 
                    { key: 'camisaPadrao', label: 'Camisa Padrão (R$60)' }, 
                    { key: 'camisaEdFisica', label: 'Camisa Ed. Física (R$60)' }, 
                    { key: 'calca', label: 'Calça (R$80)' }, 
                    { key: 'shortSaia', label: 'Short-Saia (R$60)' }, 
                    { key: 'short', label: 'Short (R$60)' }, 
                    { key: 'casaco', label: 'Casaco (R$130)' } 
                  ].map((item) => (
                    <div key={item.key} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                      <span className="text-xs font-bold text-slate-600 block mb-2">{item.label}</span>
                      <div className="flex gap-2 items-center">
                        <select value={(uniformesTamanhos as any)[item.key]} onChange={(e) => setUniformesTamanhos((prev:any) => ({ ...prev, [item.key]: e.target.value }))} className="flex-[1.5] p-2 rounded-lg border border-slate-200 text-xs font-bold bg-slate-50 text-slate-700 outline-none">
                          <option value="4 anos">4 anos</option><option value="6 anos">6 anos</option><option value="8 anos">8 anos</option><option value="10 anos">10 anos</option><option value="12 anos">12 anos</option>
                        </select>
                        <input type="number" min="0" value={(uniformesVenda as any)[item.key] || ""} onChange={(e) => setUniformesVenda((prev:any) => ({ ...prev, [item.key]: Math.max(0, parseInt(e.target.value) || 0) }))} className="flex-1 p-2 rounded-lg border border-slate-200 font-bold text-xs text-center outline-none bg-slate-50" placeholder="Qtd" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <span className="font-bold text-indigo-800">Total da Grade: R$ {totalVendaUniforme.toFixed(2)}</span>
                  <button onClick={lancarItemAvulsoNoCarrinho} className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-md hover:bg-indigo-700 transition-colors">Lançar no Carrinho</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <input type="text" placeholder="Descrição do item ou taxa..." value={novoItem.descricao} onChange={(e) => setNovoItem({...novoItem, descricao: e.target.value})} className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-indigo-500" />
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">R$</span>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={novoItem.valor} onChange={(e) => setNovoItem({...novoItem, valor: e.target.value})} className="w-full pl-9 p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-bold outline-none focus:border-indigo-500" />
                  </div>
                  <button onClick={lancarItemAvulsoNoCarrinho} className="px-6 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-lg shadow-md transition-colors">Incluir</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// OS RESTANTES MODAIS (Abertura, Fechamento, etc) FORAM MANTIDOS INTACTOS PARA PRESERVAR A SEGURANÇA.
// Apenas as classes Tailwind foram limpas nos componentes principais.

export function ModalAberturaCaixa({ modalCaixaAberto, setModalCaixaAberto, fundoTrocoAbertura, setFundoTrocoAbertura, abrirCaixa, processando }: any) {
  if (!modalCaixaAberto) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
        <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg> Abertura de Caixa
        </h3>
        <p className="text-sm text-slate-500 mb-6">Informe o valor inicial que já está na gaveta (Fundo de Troco).</p>
        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Fundo de Troco (R$)</label>
        <input type="number" step="0.01" min="0" placeholder="0.00" value={fundoTrocoAbertura} onChange={(e) => setFundoTrocoAbertura(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-lg mb-6" />
        <div className="flex gap-3">
          <button onClick={() => setModalCaixaAberto(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
          <button onClick={abrirCaixa} disabled={processando} className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700">Abrir Caixa</button>
        </div>
      </div>
    </div>
  );
}

export function ModalFechamentoCaixa({ modalFechamentoAberto, setModalFechamentoAberto, gavetaInformada, setGavetaInformada, confirmarFechamentoCaixa, processando }: any) {
  if (!modalFechamentoAberto) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
        <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> Fecho Cego
        </h3>
        <p className="text-sm text-slate-500 mb-6">Para auditoria, conte as notas e moedas e informe o valor físico exato na gaveta.</p>
        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Dinheiro em Espécie (R$)</label>
        <input type="number" step="0.01" min="0" placeholder="0.00" value={gavetaInformada} onChange={(e) => setGavetaInformada(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-lg mb-6" />
        <div className="flex gap-3">
          <button onClick={() => setModalFechamentoAberto(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">Voltar</button>
          <button onClick={confirmarFechamentoCaixa} disabled={processando} className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-slate-800 hover:bg-slate-900 shadow-md">Concluir Fecho</button>
        </div>
      </div>
    </div>
  );
}

export function ModalMeusCaixas({ modalMeusCaixas, setModalMeusCaixas, historicoCaixas, historicoGeral, clean }: any) {
  const [caixaExpandido, setCaixaExpandido] = useState<string | null>(null);
  
  if (!modalMeusCaixas) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
        <div className="p-5 flex justify-between items-center border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-black text-slate-800">Meus Caixas (Auditoria)</h3>
          <button onClick={() => setModalMeusCaixas(false)} className="p-2 text-slate-400 hover:text-rose-600 bg-white rounded-lg border border-slate-200 shadow-sm"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50">
          {historicoCaixas.length === 0 ? <p className="text-center text-slate-500 py-10">Nenhum caixa encontrado.</p> : (
            <div className="space-y-4">
              {historicoCaixas.map((caixa: any) => {
                const isExpanded = caixaExpandido === caixa.id;
                const resumo = caixa.resumo_metodos || {};
                const quebra = clean(caixa.quebra_caixa);
                
                const recebimentosDesteCaixa = historicoGeral ? historicoGeral.filter((h: any) => h.caixa_id === caixa.id) : [];

                return (
                  <div key={caixa.id} className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col shadow-sm transition-all">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setCaixaExpandido(isExpanded ? null : caixa.id)}>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${caixa.status === 'aberto' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{caixa.status}</span>
                          <span className="text-sm font-bold text-slate-800">Sessão de {new Date(caixa.data_abertura).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <span className="text-xs text-slate-500">Operador: {caixa.operador_nome}</span>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">Apurado Final</span>
                          <span className="text-lg font-black text-indigo-700">R$ {clean(caixa.total_apurado).toFixed(2)}</span>
                        </div>
                        <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Movimentações do Turno</h4>
                          <div className="flex justify-between text-xs text-slate-600"><span className="font-semibold">Fundo Inicial:</span> <span>R$ {clean(caixa.fundo_inicial).toFixed(2)}</span></div>
                          <div className="flex justify-between text-xs text-slate-600"><span className="font-semibold">(+) Entradas:</span> <span>R$ {(clean(caixa.total_apurado) - clean(caixa.fundo_inicial)).toFixed(2)}</span></div>
                          <div className="flex justify-between text-xs text-emerald-600"><span className="font-semibold">(+) Suprimentos:</span> <span>R$ {clean(resumo.suprimentos).toFixed(2)}</span></div>
                          <div className="flex justify-between text-xs text-rose-600"><span className="font-semibold">(-) Sangrias:</span> <span>R$ {clean(resumo.sangrias).toFixed(2)}</span></div>
                          {caixa.status === 'fechado' && (
                            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                              <div className="flex justify-between text-xs text-slate-700 mb-1"><span className="font-bold">Gaveta Esperada (Sistema):</span> <span>R$ {clean(resumo.esperadoGaveta).toFixed(2)}</span></div>
                              <div className="flex justify-between text-xs text-slate-700 mb-2"><span className="font-bold">Gaveta Contada (Operador):</span> <span>R$ {clean(caixa.valor_em_dinheiro_informado).toFixed(2)}</span></div>
                              <div className={`flex justify-between text-xs font-black ${quebra === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                <span>RESULTADO / QUEBRA:</span> <span>{quebra > 0 ? '+' : ''} R$ {quebra.toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Formas de Recebimento</h4>
                          <div className="flex justify-between text-xs text-slate-600"><span className="font-semibold">Pix:</span> <span>R$ {clean(resumo.pix).toFixed(2)}</span></div>
                          <div className="flex justify-between text-xs text-slate-600"><span className="font-semibold">Dinheiro Físico:</span> <span>R$ {clean(resumo.dinheiro).toFixed(2)}</span></div>
                          <div className="flex justify-between text-xs text-slate-600"><span className="font-semibold">Cartão de Crédito:</span> <span>R$ {clean(resumo.credito).toFixed(2)}</span></div>
                          <div className="flex justify-between text-xs text-slate-600"><span className="font-semibold">Cartão de Débito:</span> <span>R$ {clean(resumo.debito).toFixed(2)}</span></div>
                          <div className="flex justify-between text-xs text-slate-600"><span className="font-semibold">Boleto:</span> <span>R$ {clean(resumo.boleto).toFixed(2)}</span></div>
                        </div>

                        <div className="col-span-1 md:col-span-2 mt-2 pt-4 border-t border-slate-200">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Detalhamento de Transações (Recebimentos)</h4>
                          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-50 sticky top-0 shadow-sm">
                                <tr>
                                  <th className="p-3 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">Descrição do Item</th>
                                  <th className="p-3 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">Forma de Pagto</th>
                                  <th className="p-3 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 text-right">Valor Pago</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recebimentosDesteCaixa.map((rec: any) => {
                                  const metodos = rec.detalhes_metodos?.historico_parciais 
                                    ? rec.detalhes_metodos.historico_parciais.map((p:any) => p.formas).join(' | ') 
                                    : 'Não informado';
                                  return (
                                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                      <td className="p-3 text-xs font-bold text-slate-700">{rec.descricao}</td>
                                      <td className="p-3 text-[10px] font-medium text-slate-500">{metodos}</td>
                                      <td className="p-3 text-xs font-black text-emerald-600 text-right">R$ {clean(rec.valor_pago).toFixed(2)}</td>
                                    </tr>
                                  );
                                })}
                                {recebimentosDesteCaixa.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="p-4 text-xs text-slate-400 text-center font-medium">Nenhum recebimento registrado neste turno.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ModalMovimentacaoCaixa({ modalMovimentacao, setModalMovimentacao, formMovimentacao, setFormMovimentacao, handleRegistrarMovimentacao, processando }: any) {
  if (!modalMovimentacao.aberto) return null;
  const isSangria = modalMovimentacao.tipo === 'sangria';
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
        <h3 className={`text-lg font-black mb-2 flex items-center gap-2 ${isSangria ? 'text-rose-600' : 'text-emerald-600'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isSangria ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />}
          </svg>
          Registrar {isSangria ? 'Sangria (Retirada)' : 'Suprimento (Entrada)'}
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          {isSangria ? 'Retirada de dinheiro da gaveta para cofre ou pagamentos.' : 'Entrada de dinheiro na gaveta (ex: reforço de troco).'}
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Motivo / Descrição</label>
            <input 
              type="text" placeholder="Ex: Retirada para o cofre principal"
              value={formMovimentacao.descricao} onChange={(e) => setFormMovimentacao({...formMovimentacao, descricao: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Valor (R$)</label>
            <input 
              type="number" step="0.01" min="0" placeholder="0.00"
              value={formMovimentacao.valor} onChange={(e) => setFormMovimentacao({...formMovimentacao, valor: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-lg"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button onClick={() => setModalMovimentacao({aberto: false, tipo: 'sangria'})} className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">
            Cancelar
          </button>
          <button onClick={handleRegistrarMovimentacao} disabled={processando} className={`flex-1 py-3 rounded-xl font-bold text-sm text-white ${isSangria ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalCheckout({ aberto, setAberto, carrinho, subtotalCarrinho, acrescimos, setAcrescimos, totalComAcrescimos, pagamentos, setPagamentos, temLivroNoCarrinho, saldoAtualAluno, trocoGerado, acaoTroco, setAcaoTroco, faltaPagar, finalizarVenda, processando, clean, totalPagoRodada, dataPagamentoPDV, setDataPagamentoPDV }: any) {
  const [taxaDebito, setTaxaDebito] = useState("");
  const [taxaCredito, setTaxaCredito] = useState("");

  if (!aberto) return null;

  const handleCardChange = (tipo: 'debito' | 'credito', valor: string, taxaMapeada?: string) => {
    const novaTaxaDebito = tipo === 'debito' ? (taxaMapeada !== undefined ? taxaMapeada : taxaDebito) : taxaDebito;
    const novaTaxaCredito = tipo === 'credito' ? (taxaMapeada !== undefined ? taxaMapeada : taxaCredito) : taxaCredito;
    
    const novoPagamentos = {
      ...pagamentos,
      [tipo]: valor
    };
    
    setPagamentos(novoPagamentos);

    const valDeb = clean(novoPagamentos.debito);
    const tDeb = clean(novaTaxaDebito);
    const jurosDeb = tDeb > 0 ? (valDeb - (valDeb / (1 + tDeb / 100))) : 0;

    const valCred = clean(novoPagamentos.credito);
    const tCred = clean(novaTaxaCredito);
    const jurosCred = tCred > 0 ? (valCred - (valCred / (1 + tCred / 100))) : 0;

    const totalJuros = jurosDeb + jurosCred;

    setAcrescimos({
      ...acrescimos,
      juros_cartao: totalJuros > 0 ? totalJuros.toFixed(2) : ""
    });
  };

  const handleTaxaChange = (tipo: 'debito' | 'credito', taxa: string) => {
    if (tipo === 'debito') {
      setTaxaDebito(taxa);
      handleCardChange('debito', pagamentos.debito, taxa);
    } else {
      setTaxaCredito(taxa);
      handleCardChange('credito', pagamentos.credito, taxa);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
        
        <div className="p-5 border-b border-slate-100 bg-indigo-600 flex justify-between items-center">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            Finalizar Recebimento
          </h3>
          <button onClick={() => setAberto(false)} className="text-indigo-200 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col lg:flex-row">
          
          <div className="flex-[3] p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block truncate">Data Pagamento</label>
                <input type="date" value={dataPagamentoPDV} onChange={(e) => setDataPagamentoPDV(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-sm font-bold text-slate-700" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block truncate">Desconto (R$)</label>
                <input type="number" step="0.01" min="0" value={acrescimos.desconto} onChange={(e) => setAcrescimos({...acrescimos, desconto: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500" placeholder="0.00" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block truncate">Multa/Juros (R$)</label>
                <input type="number" step="0.01" min="0" value={acrescimos.multa} onChange={(e) => setAcrescimos({...acrescimos, multa: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-rose-500" placeholder="0.00" />
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2">Como o cliente está pagando?</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Pix</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R$</span>
                  <input type="number" step="0.01" min="0" value={pagamentos.pix} onChange={e => setPagamentos({...pagamentos, pix: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl outline-none focus:border-indigo-500 shadow-sm" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Espécie (Dinheiro Fisico)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R$</span>
                  <input type="number" step="0.01" min="0" value={pagamentos.dinheiro} onChange={e => setPagamentos({...pagamentos, dinheiro: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl outline-none focus:border-indigo-500 shadow-sm" placeholder="0.00" />
                </div>
              </div>
              
              <div className="sm:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="text-[10px] font-bold text-indigo-600 uppercase block mb-3">Cartão de Crédito</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R$</span>
                    <input type="number" step="0.01" min="0" value={pagamentos.credito} onChange={e => handleCardChange('credito', e.target.value)} className="w-full pl-9 pr-2 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-sm font-bold text-slate-700" placeholder="Valor Total" />
                  </div>
                  <div>
                    <select value={pagamentos.parcelas} onChange={e => setPagamentos({...pagamentos, parcelas: e.target.value})} className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-700 text-sm">
                      <option value="1">À vista</option>
                      {[...Array(11)].map((_, i) => <option key={i+2} value={i+2}>{i+2}x sem juros</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">%</span>
                    <input type="number" step="0.01" min="0" value={taxaCredito} onChange={e => handleTaxaChange('credito', e.target.value)} className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-sm font-bold text-slate-700" placeholder="Taxa %" />
                  </div>
                </div>
                {(() => {
                  const valCred = clean(pagamentos.credito);
                  const tCred = clean(taxaCredito);
                  const jurosCred = tCred > 0 ? (valCred - (valCred / (1 + tCred / 100))) : 0;
                  const liquidoCred = valCred - jurosCred;
                  if (valCred > 0 && tCred > 0) {
                    return (
                      <div className="text-[11px] font-semibold text-slate-400 mt-2">
                        Separado automaticamente: Líquido R$ {liquidoCred.toFixed(2)} + Juros R$ {jurosCred.toFixed(2)}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="sm:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-3">Cartão de Débito</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R$</span>
                    <input type="number" step="0.01" min="0" value={pagamentos.debito} onChange={e => handleCardChange('debito', e.target.value)} className="w-full pl-9 pr-2 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-sm font-bold text-slate-700" placeholder="Valor Total" />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">%</span>
                    <input type="number" step="0.01" min="0" value={taxaDebito} onChange={e => handleTaxaChange('debito', e.target.value)} className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-sm font-bold text-slate-700" placeholder="Taxa %" />
                  </div>
                </div>
                {(() => {
                  const valDeb = clean(pagamentos.debito);
                  const tDeb = clean(taxaDebito);
                  const jurosDeb = tDeb > 0 ? (valDeb - (valDeb / (1 + tDeb / 100))) : 0;
                  const liquidoDeb = valDeb - jurosDeb;
                  if (valDeb > 0 && tDeb > 0) {
                    return (
                      <div className="text-[11px] font-semibold text-slate-400 mt-2">
                        Separado automaticamente: Líquido R$ {liquidoDeb.toFixed(2)} + Juros R$ {jurosDeb.toFixed(2)}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Boleto Bancário</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R$</span>
                  <input type="number" step="0.01" min="0" value={pagamentos.boleto} onChange={e => setPagamentos({...pagamentos, boleto: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl outline-none focus:border-indigo-500 shadow-sm" placeholder="0.00" />
                </div>
              </div>
            </div>

            {(saldoAtualAluno > 0 || temLivroNoCarrinho) && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                {saldoAtualAluno > 0 && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      <span className="text-sm font-bold text-emerald-800">Usar Saldo Virtual (Disp: R$ {saldoAtualAluno.toFixed(2)})</span>
                    </div>
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600/50 font-bold text-sm">R$</span>
                      <input type="number" step="0.01" min="0" placeholder="0.00" value={pagamentos.credito_aluno} onChange={e => setPagamentos({...pagamentos, credito_aluno: e.target.value})} className="w-full pl-8 py-2 bg-white border border-emerald-200 text-emerald-800 rounded-lg outline-none font-bold" />
                    </div>
                  </div>
                )}
                
                {temLivroNoCarrinho && (
                  <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl">
                    <h5 className="text-[10px] font-black text-sky-600 uppercase mb-3 flex items-center gap-1.5">Pagamento Direto - Editora FTD</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-sky-700 uppercase block mb-1">Pix (Editora)</label>
                        <input type="number" step="0.01" min="0" value={pagamentos.pix_editora} onChange={e => setPagamentos({...pagamentos, pix_editora: e.target.value})} className="w-full p-2.5 bg-white border border-sky-200 rounded-lg outline-none text-sm" placeholder="R$ 0.00" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-sky-700 uppercase block mb-1">Crédito (Editora)</label>
                        <input type="number" step="0.01" min="0" value={pagamentos.credito_editora} onChange={e => setPagamentos({...pagamentos, credito_editora: e.target.value})} className="w-full p-2.5 bg-white border border-sky-200 rounded-lg outline-none text-sm" placeholder="R$ 0.00" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-[2] bg-white border-l border-slate-100 flex flex-col">
            <div className="p-6 flex-1 space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">Resumo Final</h4>
              
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 max-h-[160px] overflow-y-auto custom-scrollbar space-y-2">
                {carrinho.map((item: any, idx: number) => {
                  const valorItem = clean(item.valor_total) - clean(item.valor_pago);
                  return (
                    <div key={idx} className="flex justify-between text-xs text-slate-600 border-b border-slate-200/60 pb-2 last:border-0 last:pb-0">
                      <span className="truncate pr-3 font-medium text-slate-700" title={item.descricao}>{item.descricao}</span>
                      <span className="flex-shrink-0 font-bold">R$ {valorItem.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-800 font-bold"><span>Subtotal dos Itens:</span> <span>R$ {subtotalCarrinho.toFixed(2)}</span></div>
                {clean(acrescimos.desconto) > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Descontos (-):</span> <span>R$ {clean(acrescimos.desconto).toFixed(2)}</span></div>}
                {clean(acrescimos.multa) > 0 && <div className="flex justify-between text-sm text-rose-600"><span>Multa Aplicada (+):</span> <span>R$ {clean(acrescimos.multa).toFixed(2)}</span></div>}
                {clean(acrescimos.juros_cartao) > 0 && <div className="flex justify-between text-sm text-rose-600"><span>Juros da Máquina (+):</span> <span>R$ {clean(acrescimos.juros_cartao).toFixed(2)}</span></div>}
              </div>

              <div className="pt-4 border-t border-slate-200 mt-4">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-800 uppercase">Total a Pagar</span>
                  <span className="text-3xl font-black text-indigo-700">R$ {totalComAcrescimos.toFixed(2)}</span>
                </div>
              </div>

              {trocoGerado > 0 && (
                <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200 shadow-sm animate-in zoom-in-95">
                  <h4 className="text-xs font-bold text-amber-800 uppercase mb-3 flex items-center gap-2">Troco Gerado: R$ {trocoGerado.toFixed(2)}</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <button onClick={() => setAcaoTroco('credito')} className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${acaoTroco === 'credito' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white text-amber-700 border-amber-200'}`}>Guardar Saldo P/ Aluno</button>
                    <button onClick={() => setAcaoTroco('devolver')} className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${acaoTroco === 'devolver' ? 'bg-slate-700 text-white border-slate-700 shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}>Devolver Dinheiro Físico</button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase">{faltaPagar > 0 ? 'Falta Receber' : 'Status'}</span>
                <span className={`text-xl font-black ${faltaPagar > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {faltaPagar > 0 ? `R$ ${faltaPagar.toFixed(2)}` : 'Pronto para Fechar'}
                </span>
              </div>
              <button 
                onClick={finalizarVenda} 
                disabled={processando || (totalComAcrescimos > 0 && totalPagoRodada === 0 && clean(acrescimos.desconto) === 0)} 
                className={`w-full py-4 rounded-xl font-bold text-base uppercase tracking-wider transition-all duration-200 flex justify-center items-center gap-2 ${processando || (totalComAcrescimos > 0 && totalPagoRodada === 0 && clean(acrescimos.desconto) === 0) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : (faltaPagar > 0 ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg')}`}
              >
                {processando ? "Processando..." : (faltaPagar > 0 ? "Pagamento Parcial" : "Confirmar Recebimento")}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}