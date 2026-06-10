"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UploadComprovante } from "./UploadComprovante";

interface ModalConfirmarPagamentoProps {
  aberto: boolean;
  contaParaPagar: any;
  salvandoPgto: boolean;
  onRegistrarPagamento: (file: File | null, dataPgto: string) => void;
  onFechar: () => void;
}

export function ModalConfirmarPagamento({ aberto, contaParaPagar, salvandoPgto, onRegistrarPagamento, onFechar }: ModalConfirmarPagamentoProps) {
  const [dataPagamento, setDataPagamento] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);

  // Sincroniza a data do modal com a data da conta quando o modal abre
  useEffect(() => {
    if (aberto && contaParaPagar) {
      const dataInicial = contaParaPagar.data_pagamento || new Date().toISOString().split('T')[0];
      setDataPagamento(dataInicial);
      setArquivoSelecionado(null);
    }
  }, [aberto, contaParaPagar]);

  if (!aberto || !contaParaPagar) return null;

  const ehEdicao = !!contaParaPagar.pago;

  return (
    <div 
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={onFechar}
    >
      <div 
        style={{ backgroundColor: 'white', padding: '40px', borderRadius: '30px', width: '90%', maxWidth: '450px', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 10px' }}>{ehEdicao ? "Editar Pagamento" : "Confirmar Pagamento"}</h2>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>
          {ehEdicao ? "Atualizando registro de:" : "Registrando pagamento para:"} <br/>
          <strong>{contaParaPagar.descricao} (R$ {contaParaPagar.valor.toLocaleString('pt-BR')})</strong>
        </p>

        <div style={{ marginBottom: '25px', textAlign: 'left' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '8px' }}>DATA DO PAGAMENTO</label>
          <input 
            type="date" 
            value={dataPagamento} 
            onChange={(e) => setDataPagamento(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', color: '#475569', fontWeight: '600' }}
          />
        </div>
        
        {salvandoPgto ? (
          <div style={{ padding: '40px', fontWeight: 'bold', color: '#2563eb' }}>Processando e salvando...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <UploadComprovante onFileSelect={(file) => setArquivoSelecionado(file)} />
            
            {arquivoSelecionado && (
              <p style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold', margin: 0 }}>
                ✓ Novo arquivo selecionado
              </p>
            )}

            <button 
              onClick={() => onRegistrarPagamento(arquivoSelecionado, dataPagamento)}
              disabled={!arquivoSelecionado && !ehEdicao}
              style={{ 
                width: '100%', 
                padding: '14px', 
                borderRadius: '12px', 
                border: 'none', 
                backgroundColor: '#2563eb', 
                color: 'white', 
                fontWeight: 'bold', 
                cursor: (arquivoSelecionado || ehEdicao) ? 'pointer' : 'not-allowed',
                opacity: (arquivoSelecionado || ehEdicao) ? 1 : 0.5,
                marginTop: '10px'
              }}
            >
              {ehEdicao ? "Salvar Alterações" : "Confirmar e Enviar"}
            </button>
          </div>
        )}

        <button 
          onClick={onFechar} 
          disabled={salvandoPgto}
          style={{ marginTop: '20px', background: 'none', border: 'none', color: '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Cancelar e Voltar
        </button>
      </div>
    </div>
  );
}