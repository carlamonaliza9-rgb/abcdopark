"use client";

import { useState } from "react";
import { 
  gerarTextoWhatsAppProvas, 
  gerarPDFCronogramaProvas, 
  gerarImagemCronogramaProvas,
  obterMateriasPadrao 
} from "@/app/(sistema)/dashboard/documentacoes/_lib/geradorProvas";

export default function PainelProvas() {
  const [turmaProvas, setTurmaProvas] = useState<string>("");
  const [tituloAvaliacao, setTituloAvaliacao] = useState<string>("1ª AVALIAÇÃO");
  const [listaProvas, setListaProvas] = useState<{materia: string, data: string, conteudo: string}[]>([
    { materia: "", data: "", conteudo: "" }
  ]);
  const [observacoesProvas, setObservacoesProvas] = useState<string>("");

  const handleDataChange = (value: string, setter: (val: string) => void) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 2) v = v.substring(0, 2) + "/" + v.substring(2);
    if (v.length > 5) v = v.substring(0, 5) + "/" + v.substring(5, 9);
    setter(v);
  };

  return (
    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxWidth: '600px', width: '100%' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '20px' }}>
        Gerar Cronograma de Avaliações
      </h2>

      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>SELECIONE A AVALIAÇÃO</label>
      <select 
        value={tituloAvaliacao} 
        onChange={(e) => setTituloAvaliacao(e.target.value)} 
        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', outline: 'none', fontSize: '14px', color: '#1e293b', backgroundColor: 'white' }}
      >
        <option value="1ª AVALIAÇÃO">1ª Avaliação</option>
        <option value="2ª AVALIAÇÃO">2ª Avaliação</option>
        <option value="3ª AVALIAÇÃO">3ª Avaliação</option>
        <option value="4ª AVALIAÇÃO">4ª Avaliação</option>
      </select>
      
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>SELECIONE A TURMA</label>
      <select 
        value={turmaProvas} 
        onChange={(e) => {
          const turmaSelecionada = e.target.value;
          setTurmaProvas(turmaSelecionada);
          
          if(turmaSelecionada) {
            setListaProvas(obterMateriasPadrao(turmaSelecionada));
          } else {
            setListaProvas([{ materia: "", data: "", conteudo: "" }]);
          }
        }} 
        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px', outline: 'none', fontSize: '14px', color: '#1e293b', backgroundColor: 'white' }}
      >
        <option value="">Escolha a turma...</option>
        <option value="Maternal">Maternal</option>
        <option value="Jardim I">Jardim I</option>
        <option value="Jardim II">Jardim II</option>
        <option value="1º Ano">1º Ano</option>
        <option value="2º Ano">2º Ano</option>
        <option value="3º Ano">3º Ano</option>
        <option value="4º Ano">4º Ano</option>
        <option value="5º Ano">5º Ano</option>
      </select>

      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>CONTEÚDO DAS AVALIAÇÕES</label>
      {listaProvas.map((prova, index) => (
        <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Matéria (ex: Língua Portuguesa)" 
              value={prova.materia} 
              onChange={(e) => {
                const novas = [...listaProvas];
                novas[index].materia = e.target.value;
                setListaProvas(novas);
              }}
              style={{ flex: 1, minWidth: '150px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
            <input 
              type="text" 
              placeholder="Data (ex: 15/06/2026)" 
              value={prova.data} 
              onChange={(e) => handleDataChange(e.target.value, (val) => {
                const novas = [...listaProvas];
                novas[index].data = val;
                setListaProvas(novas);
              })}
              maxLength={10}
              style={{ flex: 1, minWidth: '150px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>
          <textarea 
            placeholder="Descreva os conteúdos que cairão na prova..." 
            value={prova.conteudo} 
            onChange={(e) => {
              const novas = [...listaProvas];
              novas[index].conteudo = e.target.value;
              setListaProvas(novas);
            }}
            rows={3} 
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
          />
          <button 
            type="button" 
            onClick={() => setListaProvas(listaProvas.filter((_, i) => i !== index))}
            style={{ alignSelf: 'flex-end', padding: '8px 15px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
          >
            Remover
          </button>
        </div>
      ))}

      <button 
        type="button" 
        onClick={() => setListaProvas([...listaProvas, { materia: "", data: "", conteudo: "" }])} 
        style={{ width: '100%', padding: '12px', backgroundColor: '#f1f5f9', border: '1px dashed #94a3b8', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '25px' }}
      >
        + Adicionar Outra Matéria
      </button>

      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>OBSERVAÇÕES GERAIS (OPCIONAL)</label>
      <textarea 
        placeholder="Insira observações complementares (Ex: Horários de plantão, datas de segunda chamada, fardamento...)" 
        value={observacoesProvas} 
        onChange={(e) => setObservacoesProvas(e.target.value)} 
        rows={4} 
        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px', color: '#1e293b' }} 
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={async () => {
            if(!turmaProvas) return alert('Por favor, selecione a turma antes de gerar o documento.');
            await gerarPDFCronogramaProvas(turmaProvas, listaProvas, tituloAvaliacao, "", observacoesProvas);
          }} 
          style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          BAIXAR CRONOGRAMA EM PDF 📄
        </button>

        <button 
          onClick={async () => {
            if(!turmaProvas) return alert('Por favor, selecione a turma antes de gerar a imagem.');
            await gerarImagemCronogramaProvas(turmaProvas, listaProvas, tituloAvaliacao, "", observacoesProvas);
          }} 
          style={{ width: '100%', padding: '16px', backgroundColor: '#f59e0b', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          BAIXAR CRONOGRAMA EM IMAGEM 🖼️
        </button>
        
        <button 
          onClick={() => {
            if(!turmaProvas) return alert('Por favor, selecione a turma antes de gerar a mensagem.');
            const txt = gerarTextoWhatsAppProvas(turmaProvas, listaProvas, tituloAvaliacao, observacoesProvas);
            navigator.clipboard.writeText(txt);
            alert('Mensagem formatada copiada com sucesso! Vá no WhatsApp e aperte Colar.');
          }} 
          style={{ width: '100%', padding: '16px', backgroundColor: '#22c55e', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          COPIAR TEXTO PARA WHATSAPP 📱
        </button>
      </div>
    </div>
  );
}