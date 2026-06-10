"use client";

import { useState } from "react";

interface ModalListaGastosProps {
  aberto: boolean;
  onFechar: () => void;
  mesFiltro: string;
  listaGastos: any[];
  titulo?: string; // Adicionado para alternar entre Gastos e Receitas
  onExcluir?: (id: string) => void; // Adicionado para permitir exclusão
}

export function ModalListaGastos({ 
  aberto, 
  onFechar, 
  mesFiltro, 
  listaGastos, 
  titulo, 
  onExcluir 
}: ModalListaGastosProps) {
  if (!aberto) return null;

  // Lógica cirúrgica para identificar se estamos vendo Receitas ou Gastos para ajustar a cor
  const ehReceita = titulo?.toLowerCase().includes("receita");

  return (
    <div 
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
      onClick={onFechar}
    >
      <div 
        style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '95%', maxWidth: '700px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{titulo || `Gastos de ${mesFiltro}`}</h2>
          <button onClick={onFechar} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
              <tr style={{ color: '#6b7280', borderBottom: '2px solid #f3f4f6' }}>
                <th style={{ padding: '12px' }}>DESCRIÇÃO</th>
                <th>DATA</th>
                <th>VALOR</th>
                {onExcluir && <th style={{ textAlign: 'center' }}>AÇÕES</th>}
              </tr>
            </thead>
            <tbody>
              {listaGastos.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px' }}>{g.descricao}</td>
                  <td>{new Date(g.data_gasto).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                  <td style={{ color: ehReceita ? '#10b981' : '#b91c1c', fontWeight: 'bold' }}>
                    R$ {parseFloat(g.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  {onExcluir && (
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => onExcluir(g.id)} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                        title="Excluir registro"
                      >
                        🗑️
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {listaGastos.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    Nenhum registro encontrado para este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}