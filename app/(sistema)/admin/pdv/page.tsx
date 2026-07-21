"use client";

import { Suspense } from "react";
import { 
  HeaderPDV, 
  ModalAberturaCaixa, 
  ModalFechamentoCaixa, 
  ModalMeusCaixas, 
  ModalMovimentacaoCaixa, 
  ModalCheckout,
  ModalEditarRegistroRecente,
  IdentificacaoCliente, 
  AreaDeVendasComAbas, 
  CarrinhoLateral, 
  StatusCaixaReduzido, 
  RadarInadimplencia,
  RegistrosRecentesPDV
} from "./_components/PDVViews";
import { usePDV } from "./_hooks/usePDV";

function PDVContent() {
  const pdv = usePDV();

  if (pdv.carregando && pdv.historicoGeral.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="text-slate-500 font-medium tracking-wide animate-pulse">Iniciando Terminal PDV...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 font-sans text-slate-800 pb-24 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-[1500px] w-full mx-auto space-y-4 md:space-y-6">
        
        <HeaderPDV router={pdv.router} />
        
        <StatusCaixaReduzido 
          caixaAtual={pdv.caixaAtual} 
          setModalFechamentoAberto={pdv.setModalFechamentoAberto} 
          carregarHistoricoCaixas={pdv.carregarHistoricoCaixas} 
          setModalMovimentacao={pdv.setModalMovimentacao} 
        />

        <ModalAberturaCaixa 
          modalCaixaAberto={pdv.modalCaixaAberto} 
          setModalCaixaAberto={pdv.setModalCaixaAberto} 
          fundoTrocoAbertura={pdv.fundoTrocoAbertura} 
          setFundoTrocoAbertura={pdv.setFundoTrocoAbertura} 
          abrirCaixa={pdv.abrirCaixa} 
          processando={pdv.processando} 
        />

        <ModalFechamentoCaixa 
          modalFechamentoAberto={pdv.modalFechamentoAberto} 
          setModalFechamentoAberto={pdv.setModalFechamentoAberto} 
          gavetaInformada={pdv.gavetaInformada} 
          setGavetaInformada={pdv.setGavetaInformada} 
          confirmarFechamentoCaixa={pdv.confirmarFechamentoCaixa} 
          processando={pdv.processando} 
        />

        <ModalMeusCaixas 
          modalMeusCaixas={pdv.modalMeusCaixas} 
          setModalMeusCaixas={pdv.setModalMeusCaixas} 
          historicoCaixas={pdv.historicoCaixas} 
          historicoGeral={pdv.historicoGeral}
          clean={pdv.clean} 
        />

        <ModalMovimentacaoCaixa 
          modalMovimentacao={pdv.modalMovimentacao} 
          setModalMovimentacao={pdv.setModalMovimentacao} 
          formMovimentacao={pdv.formMovimentacao} 
          setFormMovimentacao={pdv.setFormMovimentacao} 
          handleRegistrarMovimentacao={pdv.handleRegistrarMovimentacao} 
          processando={pdv.processando} 
        />

        <ModalCheckout 
          aberto={pdv.modalCheckoutAberto}
          setAberto={pdv.setModalCheckoutAberto} 
          carrinho={pdv.carrinho}
          subtotalCarrinho={pdv.subtotalCarrinho} 
          acrescimos={pdv.acrescimos}
          setAcrescimos={pdv.setAcrescimos} 
          totalComAcrescimos={pdv.totalComAcrescimos}
          pagamentos={pdv.pagamentos} 
          setPagamentos={pdv.setPagamentos}
          temLivroNoCarrinho={pdv.temLivroNoCarrinho} 
          saldoAtualAluno={pdv.saldoAtualAluno}
          trocoGerado={pdv.trocoGerado} 
          acaoTroco={pdv.acaoTroco}
          setAcaoTroco={pdv.setAcaoTroco} 
          faltaPagar={pdv.faltaPagar}
          finalizarVenda={pdv.finalizarVenda} 
          processando={pdv.processando}
          clean={pdv.clean}
          totalPagoRodada={pdv.totalPagoRodada}
          dataPagamentoPDV={pdv.dataPagamentoPDV}
          setDataPagamentoPDV={pdv.setDataPagamentoPDV}
        />

        <ModalEditarRegistroRecente
          modalEditarRegistroRecente={pdv.modalEditarRegistroRecente}
          setModalEditarRegistroRecente={pdv.setModalEditarRegistroRecente}
          registroRecenteSelecionado={pdv.registroRecenteSelecionado}
          formRegistroRecente={pdv.formRegistroRecente}
          setFormRegistroRecente={pdv.setFormRegistroRecente}
          salvarEdicaoRegistroRecente={pdv.salvarEdicaoRegistroRecente}
          desfazerRegistroRecente={pdv.desfazerRegistroRecente}
          registroPodeSerAlterado={pdv.registroPodeSerAlterado}
          processando={pdv.processando}
          clean={pdv.clean}
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-4">
            <IdentificacaoCliente 
              alunoSelecionado={pdv.alunoSelecionado}
              setAlunoSelecionado={pdv.setAlunoSelecionado} 
              buscaAluno={pdv.buscaAluno}
              setBuscaAluno={pdv.setBuscaAluno} 
              alunosFiltrados={
                pdv.buscaAluno === ""
                  ? pdv.alunos.slice(0, 5)
                  : pdv.alunos
                      .filter((a: any) => a.nome.toLowerCase().includes(pdv.buscaAluno.toLowerCase()))
                      .slice(0, 5)
              } 
              saldoAtualAluno={pdv.saldoAtualAluno} 
            />

            {!pdv.alunoSelecionado ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-300">
                <RadarInadimplencia 
                  inadimplentesTop5={pdv.inadimplentesTop5}
                  setAlunoSelecionado={pdv.setAlunoSelecionado}
                />

                {!pdv.caixaAtual && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h4 className="font-black text-slate-800 mb-1">Caixa Fechado</h4>
                    <p className="text-xs text-slate-500 mb-6">Abra o caixa para iniciar os recebimentos do turno.</p>
                    <button
                      onClick={() => pdv.setModalCaixaAberto(true)}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md w-full"
                    >
                      Abrir Caixa Agora
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <AreaDeVendasComAbas 
                alunoSelecionado={pdv.alunoSelecionado}
                dividasAluno={pdv.dividasAluno} 
                carrinho={pdv.carrinho}
                removerDoCarrinho={pdv.removerDoCarrinho} 
                adicionarAoCarrinho={pdv.adicionarAoCarrinho}
                clean={pdv.clean} 
                novoItem={pdv.novoItem}
                setNovoItem={pdv.setNovoItem} 
                uniformesTamanhos={pdv.uniformesTamanhos}
                setUniformesTamanhos={pdv.setUniformesTamanhos} 
                uniformesVenda={pdv.uniformesVenda}
                setUniformesVenda={pdv.setUniformesVenda} 
                totalVendaUniforme={pdv.totalVendaUniforme}
                lancarItemAvulsoNoCarrinho={pdv.lancarItemAvulsoNoCarrinho} 
                inadimplentesTop5={pdv.inadimplentesTop5}
              />
            )}
          </div>

          <CarrinhoLateral 
            caixaAtual={pdv.caixaAtual}
            alunoSelecionado={pdv.alunoSelecionado} 
            carrinho={pdv.carrinho}
            removerDoCarrinho={pdv.removerDoCarrinho} 
            subtotalCarrinho={pdv.subtotalCarrinho}
            setModalCaixaAberto={pdv.setModalCaixaAberto} 
            abrirModalCheckout={() => pdv.setModalCheckoutAberto(true)} 
          />
        </div>

        {pdv.caixaAtual && (
          <RegistrosRecentesPDV
            registrosRecentes={pdv.registrosRecentes}
            clean={pdv.clean}
            abrirModalEditarRegistroRecente={pdv.abrirModalEditarRegistroRecente}
            desfazerRegistroRecente={pdv.desfazerRegistroRecente}
            registroPodeSerAlterado={pdv.registroPodeSerAlterado}
            carregarRegistrosRecentes={pdv.carregarRegistrosRecentes}
            processando={pdv.processando}
          />
        )}
      </div>
    </div>
  );
}

export default function PDVPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    }>
      <PDVContent />
    </Suspense>
  );
}