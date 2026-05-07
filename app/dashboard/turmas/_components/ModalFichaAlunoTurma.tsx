"use client";

interface ModalFichaAlunoTurmaProps {
  aluno: any;
  onClose: () => void;
  historico?: any[];
  ehAdmin: boolean;
  // Propriedade adicionada para sincronizar com a page.tsx
  calcularIdade: (data: string) => string;
}

export function ModalFichaAlunoTurma({ aluno, onClose, historico = [], ehAdmin, calcularIdade }: ModalFichaAlunoTurmaProps) {
  if (!aluno) return null;

  const abrirWhatsApp = (numero: any) => {
    if (!numero) return;
    const apenasNumeros = String(numero).replace(/\D/g, '');
    window.open(`https://wa.me/55${apenasNumeros}`, '_blank');
  };

  // LISTA DE CONTATOS ORGANIZADA (Busca os nomes novos do banco)
  const contatos = [
    { nome: aluno.responsavel, whats: aluno.whatsapp, tag: aluno.parentesco_1 || "Mãe", cor: "#db2777", bg: "#fdf2f8" },
    { nome: aluno.responsavel2 || aluno.responsavel_2_nome, whats: aluno.whatsapp2 || aluno.responsavel_2_contato, tag: aluno.parentesco_2 || "Pai", cor: "#2563eb", bg: "#eff6ff" },
    { nome: aluno.responsavel3 || aluno.responsavel_3_nome, whats: aluno.whatsapp3 || aluno.responsavel_3_contato, tag: aluno.parentesco_3 || "Outro", cor: "#16a34a", bg: "#f0fdf4" }
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '30px', width: '95%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>✕</button>
        
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {aluno.foto_url ? (
              <img src={aluno.foto_url} style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} alt="Foto" />
            ) : (
              <div style={{ width: '110px', height: '110px', borderRadius: '50%', backgroundColor: '#f1f5f9', margin: '0 auto', fontSize: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                👤
              </div>
            )}
            
            {aluno.e_autista && (
               <span style={{ position: 'absolute', bottom: 5, right: 0, fontSize: '24px', backgroundColor: 'white', borderRadius: '50%', padding: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  🧩
               </span>
            )}
          </div>

          <h2 style={{ margin: '15px 0 5px', fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>{aluno.nome}</h2>
          
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginTop: '5px' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>{calcularIdade(aluno.data_nascimento)}</span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>{aluno.turma}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
            <small style={{ color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Data de Nascimento</small>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: '#475569' }}>
              {aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--'}
            </p>
          </div>

          {ehAdmin && (
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
              <small style={{ color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>DOCUMENTO (CPF)</small>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>{aluno.cpf_aluno || '--'}</p>
            </div>
          )}
        </div>

        {/* SEÇÃO DE CONTATOS SINGELAS */}
        <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9', marginTop: '15px' }}>
          <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', margin: '0 0 12px', textTransform: 'uppercase' }}>Contatos de Emergência</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {contatos.map((contato, index) => contato.nome && (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: contato.cor, backgroundColor: contato.bg, padding: '1px 6px', borderRadius: '4px', alignSelf: 'flex-start', textTransform: 'uppercase' }}>
                    {contato.tag}
                  </span>
                  <p style={{ margin: 0, fontWeight: '700', color: '#475569', fontSize: '13px' }}>{contato.nome}</p>
                </div>
                {contato.whats && (
                  <button onClick={() => abrirWhatsApp(contato.whats)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', opacity: 0.8 }}>
                    <span style={{ fontSize: '20px' }}>📱</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Alerta de Alergia Detalhado */}
        {aluno.tem_alergia && (
          <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '15px', marginTop: '15px', border: '1px solid #fecaca' }}>
            <p style={{ margin: 0, color: '#dc2626', fontWeight: 'bold', fontSize: '11px', marginBottom: '5px', textTransform: 'uppercase' }}>⚠️ Alergia / Restrição</p>
            <p style={{ margin: 0, color: '#991b1b', fontSize: '14px', fontWeight: '600' }}>{aluno.alergia_descricao || "Sim"}</p>
          </div>
        )}

        {/* Histórico Pedagógico */}
        <div style={{ marginTop: '25px' }}>
          <h4 style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase' }}>Eventos e Registros</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
            {historico.filter(item => !(item.valor !== undefined || item.tipo === 'financeiro')).length > 0 ? (
              historico.filter(item => !(item.valor !== undefined || item.tipo === 'financeiro')).map((item: any, idx: number) => (
                <div key={idx} style={{ backgroundColor: '#f9fafb', padding: '10px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                   <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                     {new Date(item.created_at || item.data).toLocaleDateString('pt-BR')}
                   </span>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155', fontWeight: '500' }}>{item.descricao || item.observacao}</p>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '12px', color: '#cbd5e1', textAlign: 'center', padding: '10px' }}>Nenhum registro pedagógico.</p>
            )}
          </div>
        </div>

        <div style={{ marginTop: '30px' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '16px', borderRadius: '15px', border: 'none', backgroundColor: '#1e3a8a', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            FECHAR FICHA
          </button>
        </div>
      </div>
    </div>
  );
}