import { supabase } from "@/lib/supabase";

// Auxiliar para garantir conversão numérica limpa
const cleanValue = (val: any): number => {
  if (!val || val === "") return 0;
  return parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
};

interface ProcessarPagamentoInput {
  pagamentoId: string;
  alunoId: string;
  metodosDigitados: {
    pix?: string;
    dinheiro?: string;
    credito?: string;
    debito?: string;
    boleto?: string;
    pix_editora?: string;
    credito_editora?: string;
    debito_editora?: string;
    multa?: string;
    desconto?: string;
    credito_aluno?: string;
    parcelas?: string;
  };
  dataInformada?: string;
}

export const financeiroService = {
  /**
   * Processa a baixa (total ou parcial) de uma obrigação financeira
   */
  async baixarObrigacao({ pagamentoId, alunoId, metodosDigitados, dataInformada }: ProcessarPagamentoInput) {
    const dataPagamentoReal = dataInformada && dataInformada !== "" ? dataInformada : new Date().toISOString().split('T')[0];

    // 1. Buscar o registro corrente da dívida
    const { data: dividaOriginal, error: errorDiv } = await supabase
      .from('historico_pagamentos')
      .select('valor_total, valor_pago, detalhes_metodos, status, descricao, tipo')
      .eq('id', pagamentoId)
      .single();

    if (errorDiv || !dividaOriginal) {
      throw new Error("Não foi possível localizar o faturamento original no banco de dados.");
    }

    // 2. Extrair valores correntes e calcular a nova base de devedora com multa/desconto informados agora
    const valorTotalAtual = cleanValue(dividaOriginal.valor_total);
    const valorPagoAnteriormente = cleanValue(dividaOriginal.valor_pago);
    
    const novaMulta = cleanValue(metodosDigitados.multa);
    const novoDesconto = cleanValue(metodosDigitados.desconto);
    
    // Dívida líquida recalculada
    const valorTotalAjustado = Math.max(0, valorTotalAtual + novaMulta - novoDesconto);
    const saldoDevedorRestante = Math.max(0, valorTotalAjustado - valorPagoAnteriormente);

    // 3. Calcular estritamente o dinheiro que está entrando NESTA rodada
    const dinheiroNestaRodada = 
      cleanValue(metodosDigitados.pix) + 
      cleanValue(metodosDigitados.dinheiro) + 
      cleanValue(metodosDigitados.credito) + 
      cleanValue(metodosDigitados.debito) + 
      cleanValue(metodosDigitados.boleto) + 
      cleanValue(metodosDigitados.pix_editora) + 
      cleanValue(metodosDigitados.credito_editora) + 
      cleanValue(metodosDigitados.debito_editora);

    const creditoUtilizadoNestaRodada = cleanValue(metodosDigitados.credito_aluno);
    const totalEntrandoNestaRodada = dinheiroNestaRodada + creditoUtilizadoNestaRodada;

    if (totalEntrandoNestaRodada <= 0 && novoDesconto <= 0) {
      throw new Error("Insira um valor financeiro para realizar a baixa.");
    }

    // 4. Montar o histórico de transações parciais (Conforme modelo Simplesvet)
    const detalhesAtuais = dividaOriginal.detalhes_metodos || {};
    const historicoParciais = Array.isArray(detalhesAtuais.historico_parciais) 
      ? [...detalhesAtuais.historico_parciais] 
      : [];

    // Descobrir quais formas de pagamento foram usadas especificamente nesta rodada
    const formasUtilizadas: string[] = [];
    if (cleanValue(metodosDigitados.pix) > 0) formasUtilizadas.push(`Pix (R$ ${cleanValue(metodosDigitados.pix).toFixed(2)})`);
    if (cleanValue(metodosDigitados.dinheiro) > 0) formasUtilizadas.push(`Dinheiro (R$ ${cleanValue(metodosDigitados.dinheiro).toFixed(2)})`);
    if (cleanValue(metodosDigitados.credito) > 0) formasUtilizadas.push(`Crédito Escola (R$ ${cleanValue(metodosDigitados.credito).toFixed(2)})`);
    if (cleanValue(metodosDigitados.debito) > 0) formasUtilizadas.push(`Débito Escola (R$ ${cleanValue(metodosDigitados.debito).toFixed(2)})`);
    if (cleanValue(metodosDigitados.boleto) > 0) formasUtilizadas.push(`Boleto (R$ ${cleanValue(metodosDigitados.boleto).toFixed(2)})`);
    if (cleanValue(metodosDigitados.pix_editora) > 0) formasUtilizadas.push(`Pix Editora (R$ ${cleanValue(metodosDigitados.pix_editora).toFixed(2)})`);
    if (cleanValue(metodosDigitados.credito_editora) > 0) formasUtilizadas.push(`Crédito Editora (R$ ${cleanValue(metodosDigitados.credito_editora).toFixed(2)})`);
    if (cleanValue(metodosDigitados.debito_editora) > 0) formasUtilizadas.push(`Débito Editora (R$ ${cleanValue(metodosDigitados.debito_editora).toFixed(2)})`);
    if (creditoUtilizadoNestaRodada > 0) formasUtilizadas.push(`Crédito Interno Abatido (R$ ${creditoUtilizadoNestaRodada.toFixed(2)})`);

    // Injeta o novo registro detalhado individualmente no array de parciais
    historicoParciais.push({
      data_recebimento: dataPagamentoReal,
      valor_pago_rodada: totalEntrandoNestaRodada,
      formas: formasUtilizadas.join(" + "),
      multa_aplicada: novaMulta,
      desconto_aplicado: novoDesconto
    });

    // 5. Atualizar o acumulador de recebimentos do registro
    const novoAcumuladoPago = valorPagoAnteriormente + totalEntrandoNestaRodada;
    
    let novoStatus = "parcial";
    let trocoGerado = 0;

    if (novoAcumuladoPago >= valorTotalAjustado) {
      novoStatus = "pago";
      if (novoAcumuladoPago > valorTotalAjustado) {
        trocoGerado = novoAcumuladoPago - valorTotalAjustado;
      }
    }

    // 6. Atualizar a tabela principal de faturamentos
    const novoJsonMetodos = {
      ...detalhesAtuais,
      ...metodosDigitados,
      historico_parciais: historicoParciais // Gravação persistente do sub-ledger
    };

    const { error: errorUpdate } = await supabase
      .from('historico_pagamentos')
      .update({
        valor_total: valorTotalAjustado,
        valor_pago: novoStatus === "pago" ? valorTotalAjustado : novoAcumuladoPago,
        status: novoStatus,
        data_pagamento: dataPagamentoReal,
        detalhes_metodos: novoJsonMetodos
      })
      .eq('id', pagamentoId);

    if (errorUpdate) throw errorUpdate;

    // 7. Atualizar a carteira de crédito do aluno se houver troco ou consumo de saldo
    if (trocoGerado > 0 || creditoUtilizadoNestaRodada > 0) {
      const { data: alunoFicha } = await supabase.from('alunos').select('saldo_credito').eq('id', alunoId).single();
      const saldoAtual = alunoFicha ? cleanValue(alunoFicha.saldo_credito) : 0;
      const novoSaldoSistema = saldoAtual - creditoUtilizadoNestaRodada + trocoGerado;
      
      await supabase.from('alunos').update({ saldo_credito: novoSaldoSistema }).eq('id', alunoId);
    }

    // 8. Gerar Previsões de Cartão Parcelado se for o caso
    const parcelas = parseInt(metodosDigitados.parcelas || "1") || 1;
    const valorCartaoDestaRodada = cleanValue(metodosDigitados.credito) + cleanValue(metodosDigitados.credito_editora);

    if (valorCartaoDestaRodada > 0 && parcelas > 1 && novoStatus === "pago") {
      const valorParcela = parseFloat((valorCartaoDestaRodada / parcelas).toFixed(2));
      const previsoes = [];

      for (let i = 1; i <= parcelas; i++) {
        const dataVencimento = new Date(dataPagamentoReal);
        dataVencimento.setMonth(dataVencimento.getMonth() + i);

        previsoes.push({
          aluno_id: alunoId,
          tipo: 'previsao_cartao',
          descricao: `Previsão Cartão (${i}/${parcelas}) - Ref: ${dividaOriginal.descricao || 'Taxa'}`,
          valor_total: valorParcela,
          valor_pago: 0,
          status: 'pendente',
          data_pagamento: dataVencimento.toISOString().split('T')[0],
          detalhes_metodos: {}
        });
      }
      await supabase.from('historico_pagamentos').insert(previsoes);
    }

    return { status: novoStatus, troco: trocoGerado };
  }
};