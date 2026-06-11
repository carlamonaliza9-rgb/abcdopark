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
  turno,
  responsavel,
  parentesco1,
  whatsapp,
  cpfResponsavel,
  emailResponsavel,
  profissaoResponsavel,
  responsavel2,
  parentesco2,
  whatsapp2,
  cpfResponsavel2,
  emailResponsavel2,
  profissaoResponsavel2,
  responsavel3,
  parentesco3,
  whatsapp3,
  emailResponsavel3,
  valor,
  vencimento,
  dataNascimento,
  temAlergia,
  alergiaDescricao,
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
  userEmail,
  onEditarPagamento,
  onExcluirPagamento,
  onGerarPDFBoletim,
  onGerarPDFHistorico
}: any) {
  return (
    <div className="w-full min-h-screen bg-slate-50/50 md:bg-[#f9fafb] p-4 md:p-8 lg:p-10 font-sans pb-32 animate-in fade-in duration-500 overflow-x-hidden">
      
      <div className="w-full max-w-[1700px] mx-auto">
        <AlunosHeader busca={busca} setBusca={setBusca} ehVisitante={ehVisitante} onNovoAluno={onNovoAluno} />

        {/* GRID DE ALUNOS: Feed no Mobile, Grid 2/3/4 colunas no Desktop */}
        <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pt-4 md:pt-0 mt-4 md:mt-6">
          {alunosFiltrados.map((aluno: any) => (
            <AlunoCard key={aluno.id} aluno={aluno} obterCorTurma={obterCorTurma} mWhatsApp={mWhatsApp} onAbrirFicha={onAbrirFicha} />
          ))}
        </div>
        
        {alunosFiltrados.length === 0 && (
          <div className="bg-white md:bg-transparent p-10 md:p-12 border-y md:border md:rounded-[2.5rem] border-slate-100 md:shadow-sm text-center mt-4 md:mt-6">
            <p className="text-[10px] md:text-xs font-black uppercase text-slate-400 tracking-widest">
              Nenhum aluno encontrado na busca.
            </p>
          </div>
        )}
      </div>

      {modalAberto && !modoEdicao && (
        <FichaAlunoModal 
          aluno={{
            id: idEdicao, nome, cpf_aluno: cpfAluno, turma, turno,
            responsavel, parentesco1: parentesco1, 
            whatsapp, cpf_responsavel: cpfResponsavel, email_responsavel: emailResponsavel,
            profissao_responsavel: profissaoResponsavel, 
            responsavel2, parentesco2: parentesco2, 
            whatsapp2, cpf_responsavel2: cpfResponsavel2, email_responsavel_2: emailResponsavel2,
            profissao_responsavel2: profissaoResponsavel2, 
            responsavel3, parentesco3: parentesco3, 
            whatsapp3, email_responsavel_3: emailResponsavel3,
            valor, vencimento, data_nascimento: dataNascimento, 
            tem_alergia: temAlergia, alergia_descricao: alergiaDescricao, 
            e_autista: eAutista, foto_url: previewUrl, observacoes
          }}
          verBoletim={verBoletim} 
          verHistorico={verHistorico} 
          notas={notas} 
          historico={historico} 
          ehVisitante={ehVisitante} 
          userEmail={userEmail} 
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
          onGerarPDFBoletim={onGerarPDFBoletim} 
          onGerarPDFHistorico={onGerarPDFHistorico} 
          onEditarPagamento={onEditarPagamento} 
          onExcluirPagamento={onExcluirPagamento} 
          calcularIdade={calcularIdade}
        />
      )}

      {modalAberto && modoEdicao && (
        <FormAlunoModal 
          idEdicao={idEdicao} previewUrl={previewUrl} carregando={carregando} mCPF={mCPF} mWhatsApp={mWhatsApp}
          form={{nome, cpfAluno, dataNascimento, turma, turno, valor, vencimento, responsavel, parentesco1, whatsapp, cpfResponsavel, emailResponsavel, profissaoResponsavel, responsavel2, parentesco2, whatsapp2, cpfResponsavel2, emailResponsavel2, profissaoResponsavel2, responsavel3, parentesco3, whatsapp3, emailResponsavel3, eAutista, temAlergia, alergiaDescricao, observacoes}}
          setForm={setForm}
          onTrocarFoto={onTrocarFoto}
          onSalvar={onSalvar} onCancelar={() => idEdicao ? setModoEdicao(false) : setModalAberto(false)}
        />
      )}
    </div>
  );
}