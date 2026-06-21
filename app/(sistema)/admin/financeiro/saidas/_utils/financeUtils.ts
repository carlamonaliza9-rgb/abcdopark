export const converterValorSeguro = (val: string | number): number => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return Math.abs(val);
  
  const str = String(val).trim();
  let numeroTratado = 0;
  
  if (str.includes(',')) {
    numeroTratado = parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  } else {
    numeroTratado = parseFloat(str) || 0;
  }
  
  // Força o valor a ser estritamente absoluto (positivo) para evitar despesas negativas
  return Number(Math.abs(numeroTratado).toFixed(2));
};

export function obterStatusConta(conta: any) {
  if (conta.pago) return { texto: "Pago", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  const hoje = new Date().toISOString().split('T')[0];
  if (conta.data_vencimento < hoje) return { texto: "Atrasado", bg: "bg-rose-50 text-rose-700 border-rose-200" }; 
  return { texto: "A Vencer", bg: "bg-amber-50 text-amber-700 border-amber-200" }; 
}