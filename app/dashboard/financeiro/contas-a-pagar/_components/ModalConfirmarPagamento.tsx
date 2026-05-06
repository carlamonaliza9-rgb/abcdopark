"use client";
import { UploadComprovante } from "./UploadComprovante";

interface ModalConfirmarPagamentoProps {
  aberto: boolean;
  contaParaPagar: any;
  salvandoPgto: boolean;
  onRegistrarPagamento: (file: File) => void;
  onFechar: () => void;
}

export function ModalConfirmarPagamento({ aberto, contaParaPagar, salvandoPgto, onRegistrarPagamento, onFechar }: ModalConfirmarPagamentoProps) {
  if (!aberto || !contaParaPagar) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '30px', width: '90%', maxWidth: '450px', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 10px' }}>Confirmar Pagamento</h2>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>
          Registrando pagamento para: <br/>
          <strong>{contaParaPagar.descricao} (R$ {contaParaPagar.valor.toLocaleString('pt-BR')})</strong>
        </p>
        
        {salvandoPgto ? (
          <div style={{ padding: '40px', fontWeight: 'bold', color: '#2563eb' }}>Processando arquivo e salvando...</div>
        ) : (
          <UploadComprovante onFileSelect={onRegistrarPagamento} />
        )}

        <button 
          onClick={onFechar} 
          disabled={salvandoPgto}
          style={{ marginTop: '25px', background: 'none', border: 'none', color: '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Cancelar e Voltar
        </button>
      </div>
    </div>
  );
}