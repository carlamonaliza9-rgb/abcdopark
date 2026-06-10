"use client";
import React from "react";
import { AlunosHeader } from "./AlunosHeader";
import { AlunoCard } from "./AlunoCard";
import { FichaAlunoModal } from "./FichaAlunoModal";

export function ProfessorView({
  busca,
  setBusca,
  alunosFiltrados,
  obterCorTurma,
  mWhatsApp,
  onAbrirFicha,
  modalAberto,
  idEdicao,
  nome,
  cpfAluno,
  turma,
  responsavel,
  parentesco1,
  whatsapp,
  responsavel2,
  parentesco2,
  whatsapp2,
  responsavel3,
  parentesco3,
  whatsapp3,
  dataNascimento,
  temAlergia,
  alergiaDescricao,
  eAutista,
  previewUrl,
  verBoletim,
  notas,
  mCPF,
  setModalAberto,
  buscarBoletim,
  calcularIdade,
  // Professor geralmente não vê financeiro, então omitimos historico e valores aqui
}: any) {
  return (
    <div style={{ width: '100%', padding: 'clamp(10px, 3vw, 25px)', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header sem o botão de novo aluno para o professor */}
      <AlunosHeader busca={busca} setBusca={setBusca} ehVisitante={true} onNovoAluno={() => {}} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
        {alunosFiltrados.map((aluno: any) => (
          <AlunoCard key={aluno.id} aluno={aluno} obterCorTurma={obterCorTurma} mWhatsApp={mWhatsApp} onAbrirFicha={onAbrirFicha} />
        ))}
      </div>

      {modalAberto && (
        <FichaAlunoModal 
          aluno={{
            id: idEdicao, nome, cpf_aluno: cpfAluno, turma, 
            responsavel, parentesco1: parentesco1, 
            whatsapp,
            responsavel2, parentesco2: parentesco2, 
            whatsapp2,
            responsavel3, parentesco3: parentesco3, 
            whatsapp3, data_nascimento: dataNascimento, 
            tem_alergia: temAlergia, alergia_descricao: alergiaDescricao, 
            e_autista: eAutista, foto_url: previewUrl
          }}
          verBoletim={verBoletim} verHistorico={false} notas={notas} historico={[]} ehVisitante={true} mCPF={mCPF} mWhatsApp={mWhatsApp}
          onFechar={() => setModalAberto(false)} 
          onEditar={() => alert("Professores não podem editar dados cadastrais.")}
          onVerBoletim={buscarBoletim} onVerHistorico={() => {}} onVoltarParaFicha={() => {}}
          onSalvarNota={() => {}} onAdicionarDisciplina={() => {}} onExcluirDisciplina={() => {}}
          onExcluir={() => {}}
          onGerarPDFBoletim={() => {}} onGerarPDFHistorico={() => {}}
          calcularIdade={calcularIdade}
        />
      )}
    </div>
  );
}