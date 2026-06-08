"use client";

interface MenuProps {
  setDocumentoAtivo: (doc: string) => void;
}

export default function MenuOpcoes({ setDocumentoAtivo }: MenuProps) {
  const opcoes = [
    { id: 'matricula', icone: '📑', titulo: 'Declaração de Matrícula', desc: 'Gera o documento padrão com dados do aluno.' },
    { id: 'quitacao', icone: '💰', titulo: 'Quitação Imposto de Renda', desc: 'Declaração de valores pagos no ano base.' },
    { id: 'ressalva', icone: '🔄', titulo: 'Ressalva', desc: 'Documento de transferência com direito à matrícula.' },
    { id: 'codes', icone: '📋', titulo: 'CODES', desc: 'Relatório oficial (1º ao 5º Ano) exigido pela SEDUC.' },
    { id: 'notificacao', icone: '⚖️', titulo: 'Notificação Extrajudicial', desc: 'Cobrança formal de débitos em aberto.' },
    { id: 'provas', icone: '📝', titulo: 'Cronograma de Provas', desc: 'Gera PDF e texto para WhatsApp com os conteúdos.' },
    { id: 'comunicados', icone: '📢', titulo: 'Avisos e Comunicados', desc: 'Avisos formatados para Pais (Azul) e Equipe (Verde).', destaque: true }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
      {opcoes.map(opcao => (
        <div 
          key={opcao.id}
          onClick={() => setDocumentoAtivo(opcao.id)} 
          style={{ 
            backgroundColor: 'white', 
            padding: '30px', 
            borderRadius: '20px', 
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', 
            cursor: 'pointer', 
            textAlign: 'center',
            border: opcao.destaque ? '2px solid #e2e8f0' : 'none'
          }}
        >
          <span style={{ fontSize: '40px', marginBottom: '15px', display: 'block' }}>{opcao.icone}</span>
          <h3 style={{ color: '#1e293b', fontWeight: '800', fontSize: '16px', margin: 0 }}>{opcao.titulo}</h3>
          <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>{opcao.desc}</p>
        </div>
      ))}
    </div>
  );
}