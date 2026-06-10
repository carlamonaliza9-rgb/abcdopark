// lib/utils.ts

/**
 * Remove acentos e caracteres especiais de uma string.
 * Excelente para criar filtros de pesquisa inteligentes.
 */
export const removerAcentos = (texto: string) => {
  if (!texto) return "";
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};