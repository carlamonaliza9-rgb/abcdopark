import { clean } from "../_utils/gerarReciboPDF";
import { mesesAno } from "./pdvConstants";

export const normalizarRef = (valor: any) =>
  String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const parseDetalhesMetodos = (detalhes: any) => {
  if (!detalhes) return {};
  if (typeof detalhes === "string") {
    try { return JSON.parse(detalhes); } catch (e) { return {}; }
  }
  return detalhes;
};

export const extrairMesReferencia = (registro: any) => {
  const detalhes = parseDetalhesMetodos(registro?.detalhes_metodos);

  const fontes = [
    detalhes?.competencia?.mes,
    registro?.mes_referencia,
    registro?.descricao,
    registro?.referencia,
  ];

  for (const fonte of fontes) {
    const fonteNorm = normalizarRef(fonte);
    const mes = mesesAno.find(m => fonteNorm.includes(normalizarRef(m)));
    if (mes) return mes;
  }

  return "";
};

export const extrairAnoReferencia = (registro: any) => {
  const detalhes = parseDetalhesMetodos(registro?.detalhes_metodos);

  const fontes = [
    detalhes?.competencia?.ano,
    registro?.ano_referencia,
    registro?.ano_competencia,
    registro?.mes_referencia,
    registro?.descricao,
    registro?.data_vencimento,
    registro?.vencimento,
  ].filter(Boolean).map(String);

  for (const fonte of fontes) {
    const match = fonte.match(/(?:^|[^\d])(20\d{2})(?:[^\d]|$)/);
    if (match) return match[1];
  }

  return "";
};

export const mesParaIndice = (mes: string) =>
  mesesAno.findIndex(m => normalizarRef(m) === normalizarRef(mes));

export const parseDataLocal = (valor: any) => {
  if (!valor) return null;

  const texto = String(valor);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
};

export const inferirAnoCompetenciaLegado = (registro: any, mesReferencia?: string) => {
  const anoExplicito = extrairAnoReferencia(registro);
  if (anoExplicito) return anoExplicito;

  const mes = mesReferencia || extrairMesReferencia(registro);
  const indiceMesCompetencia = mesParaIndice(mes);
  if (indiceMesCompetencia < 0) return "";

  // Em registros antigos, data_pagamento foi usada como data real do recebimento.
  // Janeiro/2026 pago em dezembro/2025 não tinha ano de competência salvo.
  const dataRecebimento = parseDataLocal(
    registro?.data_pagamento ||
    registro?.data_recebimento ||
    registro?.created_at
  );

  if (!dataRecebimento) return "";

  const anoRecebimento = dataRecebimento.getFullYear();
  const mesRecebimento = dataRecebimento.getMonth();

  // Correção principal: Janeiro pago em dezembro pertence ao ano seguinte.
  if (indiceMesCompetencia === 0 && mesRecebimento === 11) {
    return String(anoRecebimento + 1);
  }

  return String(anoRecebimento);
};

export const competenciasDoRegistro = (registro: any) => {
  const detalhes = parseDetalhesMetodos(registro?.detalhes_metodos);
  const competencias: { mes: string; ano: string }[] = [];

  if (Array.isArray(detalhes?.competencias_origem)) {
    detalhes.competencias_origem.forEach((comp: any) => {
      const mes = extrairMesReferencia({ mes_referencia: comp?.mes });
      const ano = String(comp?.ano || "");

      if (mes && ano) {
        competencias.push({ mes, ano });
      }
    });
  }

  const mes = extrairMesReferencia(registro);
  const ano = extrairAnoReferencia(registro) || inferirAnoCompetenciaLegado(registro, mes);

  if (mes && ano) {
    competencias.push({ mes, ano });
  }

  return competencias;
};

export const chaveCompetencia = (mes: string, ano: string) =>
  `${normalizarRef(mes)}_${ano}`;

export const registroEhDaCompetencia = (registro: any, mes: string, ano: string) => {
  const mesRegistro = extrairMesReferencia(registro);
  if (!mesRegistro || normalizarRef(mesRegistro) !== normalizarRef(mes)) return false;

  const anoRegistro = extrairAnoReferencia(registro) || inferirAnoCompetenciaLegado(registro, mesRegistro);
  if (!anoRegistro) return false;

  return String(anoRegistro) === String(ano);
};

export const calcularStatusPeloPagamento = (valorTotal: any, valorPago: any) => {
  const total = clean(valorTotal);
  const pago = clean(valorPago);

  if (pago <= 0) return 'pendente';
  if (pago >= total - 0.01) return 'pago';
  return 'parcial';
};

export const obterDataOrdenacaoRegistro = (registro: any) => {
  const detalhes = parseDetalhesMetodos(registro?.detalhes_metodos);
  const historicoParciais = Array.isArray(detalhes?.historico_parciais) ? detalhes.historico_parciais : [];
  const ultimaParcial = historicoParciais[historicoParciais.length - 1];

  // Para "Registros Recentes", a data mais confiável é a data real do lançamento no PDV.
  // Em mensalidades antigas, created_at/data_pagamento podem representar a criação da dívida
  // ou a competência/vencimento, não o pagamento feito agora.
  return (
    ultimaParcial?.data_operacao ||
    ultimaParcial?.data_recebimento ||
    detalhes?.origem_pdv?.data_operacao ||
    registro?.data_recebimento ||
    registro?.created_at ||
    registro?.updated_at ||
    registro?.data_pagamento ||
    registro?.data_vencimento ||
    new Date(0).toISOString()
  );
};

export const formatarRegistrosRecentes = (historico: any[] = [], listaAlunos: any[] = []) => {
  return [...historico]
    .filter((h: any) => h && h.id)
    .sort((a: any, b: any) => {
      const rawA = obterDataOrdenacaoRegistro(a);
      const rawB = obterDataOrdenacaoRegistro(b);
      const dataA = (parseDataLocal(rawA) || new Date(rawA)).getTime();
      const dataB = (parseDataLocal(rawB) || new Date(rawB)).getTime();
      return dataB - dataA;
    })
    .slice(0, 12)
    .map((h: any) => {
      const alunoReferencia = listaAlunos.find((a: any) => String(a.id) === String(h.aluno_id));
      const detalhes = parseDetalhesMetodos(h.detalhes_metodos);
      const historicoParciais = Array.isArray(detalhes?.historico_parciais) ? detalhes.historico_parciais : [];
      const ultimaParcial = historicoParciais[historicoParciais.length - 1];

      return {
        ...h,
        detalhes_metodos: detalhes,
        aluno_nome: alunoReferencia?.nome || h.aluno_nome || 'Aluno não identificado',
        aluno_turma: alunoReferencia?.turma || '',
        data_registro_recente: obterDataOrdenacaoRegistro(h),
        forma_resumo: ultimaParcial?.formas || detalhes?.formas || detalhes?.forma || 'Não informado',
        pode_alterar_no_caixa_atual: false
      };
    });
};