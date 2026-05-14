"use client";
import React from "react";
import { AlunosHeader } from "./AlunosHeader";
import { AlunoCard } from "./AlunoCard";
import { FichaAlunoModal } from "./FichaAlunoModal";
import { FormAlunoModal } from "./FormAlunoModal";

export function AdminView({
  busca,
  setBusca,
  ehVisitante,
  onNovoAluno,
  alunosFiltrados,
  obterCorTurma,
  mWhatsApp,
  onAbrirFicha,
  modalAberto,
  modoEdicao,
  idEdicao,
  nome,
  cpfAluno,
  turma,
  responsavel,
  parentesco1,
  whatsapp,
  cpfResponsavel,
  responsavel2,
  parentesco2,
  whatsapp2,
  cpfResponsavel2,
  responsavel3,
  parentesco3,
  whatsapp3,
  valor,
  vencimento,
  dataNascimento,
  temAlergia,
  alergiaDescricao, // CIRURGIA: Nome corrigido (estava alegiaDescricao na sua imagem)
  eAutista,
  previewUrl,
  verBoletim,
  verHistorico,
  notas,
  historico,
  mCPF,
  setModalAberto,
  setModoEdicao,
  buscarBoletim,
  buscarHistoricoPagamento,
  setVerBoletim,
  setVerHistorico,
  salvarNota,
  adicionarDisciplina,
  excluirDisciplina,
  excluirAluno,
  calcularIdade,
  carregando,
  observacoes,
  setForm,
  onTrocarFoto,
  onSalvar,
  userEmail, // ADICIONADO: Para o Vercel reconhecer
  onEditarPagamento, // ADICIONADO: Para o Vercel reconhecer
  onExcluirPagamento, // ADICIONADO: Para o Vercel reconhecer
  onGerarPDFBoletim, // ADICIONADO: Para os botões funcionarem
  onGerarPDFHistorico // ADICIONADO: Para os botões funcionarem
}: any) {
  return (
    <div style={{ width: '100%', padding: 'clamp(10px, 3vw, 25px)', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <AlunosHeader busca={busca} setBusca={setBusca} ehVisitante={ehVisitante} onNovoAluno={onNovoAluno} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
        {alunosFiltrados.map((aluno: any) => (
          <AlunoCard key={aluno.id} aluno={aluno} obterCorTurma={obterCorTurma} mWhatsApp={mWhatsApp} onAbrirFicha={onAbrirFicha} />
        ))}
      </div>

      {modalAberto && !modoEdicao && (
        <FichaAlunoModal 
          aluno={{
            id: idEdicao, nome, cpf_aluno: cpfAluno, turma, 
            responsavel, parentesco1: parentesco1, 
            whatsapp, cpf_responsavel: cpfResponsavel, 
            responsavel2, parentesco2: parentesco2, 
            whatsapp2, cpf_responsavel2: cpfResponsavel2, 
            responsavel3, parentesco3: parentesco3, 
            whatsapp3, valor, vencimento, data_nascimento: dataNascimento, 
            tem_alergia: temAlergia, alergia_descricao: alergiaDescricao, 
            e_autista: eAutista, foto_url: previewUrl
          }}
          verBoletim={verBoletim} 
          verHistorico={verHistorico} 
          notas={notas} 
          historico={historico} 
          ehVisitante={ehVisitante} 
          userEmail={userEmail} // CONECTADO
          mCPF={mCPF} 
          mWhatsApp={mWhatsApp}
          onFechar={() => setModalAberto(false)} 
          onEditar={() => setModoEdicao(true)}
          onVerBoletim={buscarBoletim} 
          onVerHistorico={buscarHistoricoPagamento} 
          onVoltarParaFicha={() => { setVerBoletim(false); setVerHistorico(false); }}
          onSalvarNota={salvarNota} 
          onAdicionarDisciplina={adicionarDisciplina} 
          onExcluirDisciplina={excluirDisciplina}
          onExcluir={excluirAluno}
          onGerarPDFBoletim={onGerarPDFBoletim} // CONECTADO
          onGerarPDFHistorico={onGerarPDFHistorico} // CONECTADO
          onEditarPagamento={onEditarPagamento} // CONECTADO
          onExcluirPagamento={onExcluirPagamento} // CONECTADO
          calcularIdade={calcularIdade}
        />
      )}

      {modalAberto && modoEdicao && (
        <FormAlunoModal 
          idEdicao={idEdicao} previewUrl={previewUrl} carregando={carregando} mCPF={mCPF} mWhatsApp={mWhatsApp}
          form={{nome, cpfAluno, dataNascimento, turma, valor, vencimento, responsavel, parentesco1, whatsapp, cpfResponsavel, responsavel2, parentesco2, whatsapp2, cpfResponsavel2, responsavel3, parentesco3, whatsapp3, eAutista, temAlergia, alergiaDescricao, observacoes}}
          setForm={setForm}
          onTrocarFoto={onTrocarFoto}
          onSalvar={onSalvar} onCancelar={() => idEdicao ? setModoEdicao(false) : setModalAberto(false)}
        />
      )}
    </div>
  );
}