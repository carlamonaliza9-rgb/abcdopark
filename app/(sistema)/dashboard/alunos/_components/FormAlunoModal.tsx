"use client";

import { FotoAlunoCropper } from "./FotoAlunoCropper";

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

  const valorVazio = (valor: any) =>
    valor === null ||
    valor === undefined ||
    (typeof valor === "string" && valor.trim() === "");

  const estiloObrigatorio = (valor: any, base: React.CSSProperties = EstiloInput): React.CSSProperties => ({
    ...base,
    border: valorVazio(valor) ? "2px solid #ef4444" : base.border,
    backgroundColor: valorVazio(valor) ? "#fff7f7" : base.backgroundColor,
  });

  const pendenciasFicha = [
    ["Foto", previewUrl],
    ["Nome", form?.nome],
    ["CPF do aluno", form?.cpfAluno],
    ["Data de nascimento", form?.dataNascimento],
    ["Sexo", form?.sexo],
    ["Turma", form?.turma],
    ["Turno", form?.turno],
    ["Mensalidade", form?.valor],
    ["Dia de vencimento", form?.vencimento],
    ["CEP", form?.cep],
    ["Endereço", form?.endereco],
    ["Número", form?.numero],
    ["Bairro", form?.bairro],
    ["Cidade", form?.cidade],
    ["Estado", form?.estado],
    ["Nome do responsável", form?.responsavel],
    ["Parentesco do responsável", form?.parentesco1],
    ["CPF do responsável", form?.cpfResponsavel],
    ["WhatsApp do responsável", form?.whatsapp],
    ["E-mail do responsável", form?.emailResponsavel],
  ]
    .filter(([, valor]) => valorVazio(valor))
    .map(([rotulo]) => String(rotulo));

  if (form?.temAlergia && valorVazio(form?.alergiaDescricao)) {
    pendenciasFicha.push("Descrição da alergia");
  }

  // --- FUNÇÃO PARA BUSCAR CEP ---
  const buscarCep = async (valor: string) => {
    const cep = valor.replace(/\D/g, "");
    setForm({ ...form, cep: cep });

    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setForm({
            ...form,
            cep: cep,
            endereco: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            estado: data.uf
          });
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };



  return (
    <div 
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '10px' }}
      onClick={onCancelar}
    >
      <div 
        style={{ backgroundColor: 'white', padding: 'clamp(15px, 5vw, 32px)', borderRadius: '24px', width: '95%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={onSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <h2 style={{ textAlign: 'center', fontWeight: '800', color: '#1e293b' }}>{idEdicao ? "Editando Ficha" : "Novo Aluno"}</h2>

          {pendenciasFicha.length > 0 && (
            <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fca5a5', borderRadius: '14px', padding: '12px' }}>
              <p style={{ margin: 0, color: '#b91c1c', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}>⚠️ Dados pendentes</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {pendenciasFicha.map((item) => (
                  <span key={item} style={{ backgroundColor: 'white', border: '1px solid #fecaca', color: '#dc2626', padding: '4px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '700' }}>{item}</span>
                ))}
              </div>
            </div>
          )}
          
          {/* FOTO COM POSICIONAMENTO, ZOOM E RECORTE REAL */}
          <FotoAlunoCropper
            previewUrl={previewUrl}
            obrigatoria
            onTrocarFoto={onTrocarFoto}
            onRemover={() => {
              setForm({ ...form, foto_url: null });
              const eventoSimulado = { target: { files: null } } as any;
              onTrocarFoto(eventoSimulado);
            }}
          />

         <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
            <input type="text" placeholder="Nome Completo" value={form?.nome || ""} onChange={(e)=>setForm({...form, nome: e.target.value})} required style={estiloObrigatorio(form?.nome)} />
            <input type="text" placeholder="CPF do Aluno" value={form?.cpfAluno || ""} onChange={(e)=>setForm({...form, cpfAluno: mCPF(e.target.value)})} style={estiloObrigatorio(form?.cpfAluno)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input type="date" value={form?.dataNascimento || ""} onChange={(e)=>setForm({...form, dataNascimento: e.target.value})} required style={estiloObrigatorio(form?.dataNascimento)} />

            <select value={form?.sexo || ""} onChange={(e) => setForm({...form, sexo: e.target.value})} required style={estiloObrigatorio(form?.sexo)}>
              <option value="">Sexo...</option>
              <option value="Feminino">Feminino</option>
              <option value="Masculino">Masculino</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <select value={form?.turma || ""} onChange={(e) => setForm({...form, turma: e.target.value})} required style={estiloObrigatorio(form?.turma)}>
              <option value="">Turma...</option>
              <option value="Maternal">Maternal</option><option value="Jardim I">Jardim I</option><option value="Jardim II">Jardim II</option>
              <option value="1º Ano">1º Ano</option><option value="2º Ano">2º Ano</option><option value="3º Ano">3º Ano</option>
              <option value="4º Ano">4º Ano</option><option value="5º Ano">5º Ano</option>
            </select>

            <select value={form?.turno || ""} onChange={(e) => setForm({...form, turno: e.target.value})} required style={estiloObrigatorio(form?.turno)}>
              <option value="">Turno...</option>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Integral">Integral</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input type="number" placeholder="Mensalidade (R$)" value={form?.valor || ""} onChange={(e)=>setForm({...form, valor: e.target.value})} style={estiloObrigatorio(form?.valor)} />
            <input type="number" placeholder="Dia Vencimento" value={form?.vencimento || ""} onChange={(e)=>setForm({...form, vencimento: e.target.value})} style={estiloObrigatorio(form?.vencimento)} />
          </div>

          {/* --- SEÇÃO: ENDEREÇO --- */}
          <div style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '15px', border: '1px solid #bbf7d0' }}>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#15803d', marginBottom: '10px', marginTop: '0', textTransform: 'uppercase' }}>Endereço Residencial</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
              <input type="text" placeholder="CEP (Automático)" value={form?.cep || ""} onChange={(e) => buscarCep(e.target.value)} maxLength={8} style={{ ...estiloObrigatorio(form?.cep), fontSize: '12px', padding: '10px' }} />
              <input type="text" placeholder="Rua / Avenida" value={form?.endereco || ""} onChange={(e)=>setForm({...form, endereco: e.target.value})} style={{ ...estiloObrigatorio(form?.endereco), fontSize: '12px', padding: '10px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
              <input type="text" placeholder="Número" value={form?.numero || ""} onChange={(e)=>setForm({...form, numero: e.target.value})} style={{ ...estiloObrigatorio(form?.numero), fontSize: '12px', padding: '10px' }} />
              <input type="text" placeholder="Bairro" value={form?.bairro || ""} onChange={(e)=>setForm({...form, bairro: e.target.value})} style={{ ...estiloObrigatorio(form?.bairro), fontSize: '12px', padding: '10px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <input type="text" placeholder="Cidade" value={form?.cidade || ""} onChange={(e)=>setForm({...form, cidade: e.target.value})} style={{ ...estiloObrigatorio(form?.cidade), fontSize: '12px', padding: '10px' }} />
              <input type="text" placeholder="UF" value={form?.estado || ""} onChange={(e)=>setForm({...form, estado: e.target.value})} maxLength={2} style={{ ...estiloObrigatorio(form?.estado), fontSize: '12px', padding: '10px', textAlign: 'center' }} />
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb', marginBottom: '10px', marginTop: '0', textTransform: 'uppercase' }}>Contatos e Responsáveis</p>
            
            {/* RESPONSÁVEL 1 */}
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '12px' }}>
              <select value={form?.parentesco1 || "Mãe"} onChange={(e)=>setForm({...form, parentesco1: e.target.value})} style={{ width: '100%', marginBottom: '8px', padding: '6px', borderRadius: '8px', border: valorVazio(form?.parentesco1) ? '2px solid #ef4444' : '1px solid #cbd5e1', backgroundColor: valorVazio(form?.parentesco1) ? '#fff7f7' : 'white', fontSize: '11px', fontWeight: 'bold' }}>
                {listaTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                <input type="text" placeholder="Nome" value={form?.responsavel || ""} onChange={(e)=>setForm({...form, responsavel: e.target.value})} required style={{ ...estiloObrigatorio(form?.responsavel), fontSize: '12px', padding: '10px' }} />
                <input type="text" placeholder="CPF" value={form?.cpfResponsavel || ""} onChange={(e)=>setForm({...form, cpfResponsavel: mCPF(e.target.value)})} style={{ ...estiloObrigatorio(form?.cpfResponsavel), fontSize: '12px', padding: '10px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input type="text" placeholder="WhatsApp" value={form?.whatsapp || ""} onChange={(e)=>setForm({...form, whatsapp: mWhatsApp(e.target.value)})} required style={{ ...estiloObrigatorio(form?.whatsapp), fontSize: '12px', padding: '10px' }} />
                <input type="text" placeholder="Profissão do Responsável 1" value={form?.profissaoResponsavel || ""} onChange={(e)=>setForm({...form, profissaoResponsavel: e.target.value})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
              </div>
              <input type="email" placeholder="E-mail" value={form?.emailResponsavel || ""} onChange={(e)=>setForm({...form, emailResponsavel: e.target.value})} style={{ ...estiloObrigatorio(form?.emailResponsavel), fontSize: '12px', padding: '10px', width: '100%', marginTop: '8px' }} />
            </div>

            {/* RESPONSÁVEL 2 */}
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '12px' }}>
              <select value={form?.parentesco2 || "Pai"} onChange={(e)=>setForm({...form, parentesco2: e.target.value})} style={{ width: '100%', marginBottom: '8px', padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold' }}>
                {listaTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                <input type="text" placeholder="Nome" value={form?.responsavel2 || ""} onChange={(e)=>setForm({...form, responsavel2: e.target.value})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
                <input type="text" placeholder="CPF" value={form?.cpfResponsavel2 || ""} onChange={(e)=>setForm({...form, cpfResponsavel2: mCPF(e.target.value)})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input type="text" placeholder="WhatsApp" value={form?.whatsapp2 || ""} onChange={(e)=>setForm({...form, whatsapp2: mWhatsApp(e.target.value)})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
                <input type="text" placeholder="Profissão do Responsável 2" value={form?.profissaoResponsavel2 || ""} onChange={(e)=>setForm({...form, profissaoResponsavel2: e.target.value})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
              </div>
              <input type="email" placeholder="E-mail" value={form?.emailResponsavel2 || ""} onChange={(e)=>setForm({...form, emailResponsavel2: e.target.value})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px', width: '100%', marginTop: '8px' }} />
            </div>

            {/* RESPONSÁVEL 3 */}
            <div>
              <select value={form?.parentesco3 || ""} onChange={(e)=>setForm({...form, parentesco3: e.target.value})} style={{ width: '100%', marginBottom: '8px', padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold' }}>
                <option value="">Outro Responsável (Opcional)...</option>
                {listaTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <input type="text" placeholder="Nome" value={form?.responsavel3 || ""} onChange={(e)=>setForm({...form, responsavel3: e.target.value})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
                <input type="text" placeholder="WhatsApp" value={form?.whatsapp3 || ""} onChange={(e)=>setForm({...form, whatsapp3: mWhatsApp(e.target.value)})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
                <input type="email" placeholder="E-mail" value={form?.emailResponsavel3 || ""} onChange={(e)=>setForm({...form, emailResponsavel3: e.target.value})} style={{ ...EstiloInput, fontSize: '12px', padding: '10px' }} />
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
            <input type="text" placeholder="Qual alergia?" value={form?.alergiaDescricao || ""} onChange={(e) => setForm({...form, alergiaDescricao: e.target.value})} required style={{ ...estiloObrigatorio(form?.alergiaDescricao), width: '100%' }} /> 
          )}

          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
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