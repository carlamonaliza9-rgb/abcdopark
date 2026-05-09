"use client";

interface FormAlunoModalProps {
  idEdicao: string | null;
  form: any;
  setForm: (dados: any) => void;
  previewUrl: string | null;
  carregando: boolean;
  mCPF: (v: string) => string;
  mWhatsApp: (v: string) => string;
  onTrocarFoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSalvar: (e: React.FormEvent) => void;
  onCancelar: () => void;
}

export function FormAlunoModal(props: FormAlunoModalProps) {
  const { idEdicao, form, setForm, previewUrl, carregando, mCPF, mWhatsApp, onTrocarFoto, onSalvar, onCancelar } = props;

  const listaTags = ["Mãe", "Pai", "Avó", "Avô", "Tio", "Tia", "Madrasta", "Padrasto", "Irmão", "Irmã", "Outro"];

  const EstiloInput = { padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '10px' }}>
      <div style={{ backgroundColor: 'white', padding: 'clamp(15px, 5vw, 32px)', borderRadius: '24px', width: '95%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <form onSubmit={onSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <h2 style={{ textAlign: 'center', fontWeight: '800', color: '#1e293b' }}>{idEdicao ? "Editando Ficha" : "Novo Aluno"}</h2>
          
          <label htmlFor="upload-foto" style={{ cursor: 'pointer', margin: '0 auto 10px' }}>
            <div style={{ height: '100px', width: '100px', borderRadius: '50%', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
              {previewUrl ? <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '10px', fontWeight: 'bold' }}>FOTO</span>}
            </div>
          </label>
          <input id="upload-foto" type="file" accept="image/*" onChange={onTrocarFoto} style={{ display: 'none' }} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
            <input type="text" placeholder="Nome Completo" value={form?.nome || ""} onChange={(e)=>setForm({...form, nome: e.target.value})} required style={EstiloInput} />
            <input type="text" placeholder="CPF do Aluno" value={form?.cpfAluno || ""} onChange={(e)=>setForm({...form, cpfAluno: mCPF(e.target.value)})} style={EstiloInput} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input type="date" value={form?.dataNascimento || ""} onChange={(e)=>setForm({...form, dataNascimento: e.target.value})} required style={EstiloInput} />
            <select value={form?.turma || ""} onChange={(e) => setForm({...form, turma: e.target.value})} required style={EstiloInput}>
              <option value="">Turma...</option>
              <option value="Maternal">Maternal</option><option value="Jardim I">Jardim I</option><option value="Jardim II">Jardim II</option>
              <option value="1º Ano">1º Ano</option><option value="2º Ano">2º Ano</option><option value="3º Ano">3º Ano</option>
              <option value="4º Ano">4º Ano</option><option value="5º Ano">5º Ano</option>
            </select>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input type="number" placeholder="Mensalidade (R$)" value={form?.valor || ""} onChange={(e)=>setForm({...form, valor: e.target.value})} style={EstiloInput} />
            <input type="number" placeholder="Dia Vencimento" value={form?.vencimento || ""} onChange={(e)=>setForm({...form, vencimento: e.target.value})} style={EstiloInput} />
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb', marginBottom: '10px', marginTop: '0', textTransform: 'uppercase' }}>Contatos e Responsáveis</p>
            
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '12px' }}>
              <select value={form?.parentesco1 || "Mãe"} onChange={(e)=>setForm({...form, parentesco1: e.target.value})} style={{ width: '100%', marginBottom: '8px', padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold' }}>
                {listaTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                <input type="text" placeholder="Nome" value={form?.responsavel || ""} onChange={(e)=>setForm({...form, responsavel: e.target.value})} required style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
                <input type="text" placeholder="CPF" value={form?.cpfResponsavel || ""} onChange={(e)=>setForm({...form, cpfResponsavel: mCPF(e.target.value)})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
              </div>
              <input type="text" placeholder="WhatsApp" value={form?.whatsapp || ""} onChange={(e)=>setForm({...form, whatsapp: mWhatsApp(e.target.value)})} required style={{ ...EstiloInput, fontSize: '12px', padding: '10px', width: '100%' }} />
            </div>

            <div style={{ borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '12px' }}>
              <select value={form?.parentesco2 || "Pai"} onChange={(e)=>setForm({...form, parentesco2: e.target.value})} style={{ width: '100%', marginBottom: '8px', padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold' }}>
                {listaTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                <input type="text" placeholder="Nome" value={form?.responsavel2 || ""} onChange={(e)=>setForm({...form, responsavel2: e.target.value})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
                <input type="text" placeholder="CPF" value={form?.cpfResponsavel2 || ""} onChange={(e)=>setForm({...form, cpfResponsavel2: mCPF(e.target.value)})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
              </div>
              <input type="text" placeholder="WhatsApp" value={form?.whatsapp2 || ""} onChange={(e)=>setForm({...form, whatsapp2: mWhatsApp(e.target.value)})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px', width: '100%' }} />
            </div>

            <div>
              <select value={form?.parentesco3 || ""} onChange={(e)=>setForm({...form, parentesco3: e.target.value})} style={{ width: '100%', marginBottom: '8px', padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold' }}>
                <option value="">Outro Responsável (Opcional)...</option>
                {listaTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px' }}>
                <input type="text" placeholder="Nome Terceiro Contato" value={form?.responsavel3 || ""} onChange={(e)=>setForm({...form, responsavel3: e.target.value})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
                <input type="text" placeholder="WhatsApp" value={form?.whatsapp3 || ""} onChange={(e)=>setForm({...form, whatsapp3: mWhatsApp(e.target.value)})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, backgroundColor: '#f0f9ff', padding: '10px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#0369a1' }}>
                    <input type="checkbox" checked={!!form?.eAutista} onChange={(e) => setForm({...form, eAutista: e.target.checked})} /> AUTISTA? 🧩
                </label>
            </div>
            <div style={{ flex: 1, backgroundColor: '#fff5f5', padding: '10px', borderRadius: '12px', border: '1px solid #fed7d7' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#c53030' }}>
                    <input type="checkbox" checked={!!form?.temAlergia} onChange={(e) => setForm({...form, temAlergia: e.target.checked})} /> ALERGIA?
                </label>
            </div>
          </div>

          {form?.temAlergia && ( 
            <input type="text" placeholder="Qual alergia?" value={form?.alergiaDescricao || ""} onChange={(e) => setForm({...form, alergiaDescricao: e.target.value})} required style={{ ...EstiloInput, width: '100%', border: '1px solid #fed7d7' }} /> 
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Observações Pedagógicas</label>
            <textarea 
              placeholder="Digite aqui as observações sobre o aluno..." 
              value={form?.observacoes || ""} 
              onChange={(e) => setForm({...form, observacoes: e.target.value})}
              style={{ ...EstiloInput, minHeight: '80px', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '5px' }}>
            <button type="button" onClick={onCancelar} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 'bold', backgroundColor: 'white', cursor: 'pointer' }}>CANCELAR</button>
            <button type="submit" disabled={carregando} style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>{carregando ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}