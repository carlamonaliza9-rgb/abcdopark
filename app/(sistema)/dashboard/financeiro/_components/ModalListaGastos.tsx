"use client";

import { useState } from "react";

interface ModalListaGastosProps {
  aberto: boolean;
  onFechar: () => void;
  mesFiltro: string;
  listaGastos: any[];
  titulo?: string;
  onExcluir?: (id: string) => void;
  // Nova propriedade opcional para receber os dados do gráfico
  distribuicaoReceitas?: {
    mensalidades: number;
    extras: number;
    pctMensalidades: number;
    pctExtras: number;
  };
}

export function ModalListaGastos({ 
  aberto, 
  onFechar, 
  mesFiltro, 
  listaGastos, 
  titulo, 
  onExcluir,
  distribuicaoReceitas
}: ModalListaGastosProps) {
  if (!aberto) return null;

  // Lógica cirúrgica para identificar se estamos vendo Receitas ou Gastos para ajustar a cor e o gráfico
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

        {/* GRÁFICO SINGELO DE RECEITAS (Só aparece se for modal de receitas e se os dados existirem) */}
        {ehReceita && distribuicaoReceitas && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '12px', textAlign: 'center' }}>COMPOSIÇÃO DAS ENTRADAS</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
              <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                Mensalidades ({distribuicaoReceitas.pctMensalidades}%)
              </span>
              <span style={{ color: '#6366f1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Taxas Extras ({distribuicaoReceitas.pctExtras}%)
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#818cf8' }}></div>
              </span>
            </div>
            
            <div style={{ width: '100%', height: '10px', display: 'flex', borderRadius: '9999px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
              <div style={{ width: `${distribuicaoReceitas.pctMensalidades}%`, backgroundColor: '#10b981', transition: 'all 0.3s' }}></div>
              <div style={{ width: `${distribuicaoReceitas.pctExtras}%`, backgroundColor: '#818cf8', transition: 'all 0.3s' }}></div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '500', color: '#64748b', marginTop: '8px' }}>
              <span>R$ {distribuicaoReceitas.mensalidades.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span>R$ {distribuicaoReceitas.extras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

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
                  <td>{g.data_gasto ? new Date(g.data_gasto + "T12:00:00").toLocaleDateString('pt-BR') : '--'}</td>
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