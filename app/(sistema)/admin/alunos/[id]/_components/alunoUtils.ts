export const clean = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};

export const mCPF = (v: string) => {
  if (!v) return "";
  return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

export const mWhatsApp = (v: string) => {
  if (!v) return "";
  let val = v.replace(/\D/g, "");
  if (val.length === 0) return "";
  if (val.length <= 2) return `(${val}`;
  if (val.length <= 7) return `(${val.substring(0, 2)}) ${val.substring(2)}`;
  return `(${val.substring(0, 2)}) ${val.substring(2, 7)}-${val.substring(7, 11)}`;
};

export const calcularIdade = (data: string) => {
  if (!data) return "--";
  const nasc = new Date(data);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return `${idade} anos`;
};

export const abrirWhatsApp = (numero: any) => {
  if (!numero) return;
  const apenasNumeros = String(numero).replace(/\D/g, '');
  window.open(`https://wa.me/55${apenasNumeros}`, '_blank');
};

export const obterMediaFinal = (n: any) => {
  const bimestres = [n.bimestre1, n.bimestre2, n.bimestre3, n.bimestre4].map((v: any) => parseFloat(v) || 0);
  const soma = bimestres.reduce((acc: number, curr: number) => acc + curr, 0);
  return (soma / 4).toFixed(1);
};

export const extrairFormaPagamento = (detalhes: any) => {
  if (!detalhes) return null;
  const metodos = Object.keys(detalhes).filter(key => parseFloat(detalhes[key]) > 0 && key !== 'historico_parciais' && key !== 'forma_geradora' && key !== 'ids_origem' && key !== 'e_subtracao' && key !== 'credito_utilizado_nesta_parcela');
  return metodos.length > 0 ? metodos.join(" + ").toUpperCase() : null;
};

export const SENHA_MESTRA = "1234";
export const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];