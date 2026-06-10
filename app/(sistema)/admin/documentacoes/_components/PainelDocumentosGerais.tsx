"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { gerarPDFMatricula } from "@/app/(sistema)/dashboard/documentacoes/_lib/geradorMatricula";
import { gerarPDFImpostoRenda } from "@/app/(sistema)/dashboard/documentacoes/_lib/geradorImpostoRenda";
import { gerarPDFRessalva } from "@/app/(sistema)/dashboard/documentacoes/_lib/geradorRessalva";
import { gerarNotificacaoExtrajudicial } from "@/app/(sistema)/dashboard/documentacoes/_lib/geradorNotificacaoExtrajudicial"; 

interface PainelDocumentosProps {
  alunos: any[];
  documentoAtivo: string;
}

const clean = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};

export default function PainelDocumentosGerais({ alunos, documentoAtivo }: PainelDocumentosProps) {
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [responsavelEscolhido, setResponsavelEscolhido] = useState({ nome: "", cpf: "", telefone: "" });
  const [sexoAluno, setSexoAluno] = useState<"M" | "F">("M");
  
  const [valorMensalidade, setValorMensalidade] = useState<string>("450,00");
  const [mesesPagos, setMesesPagos] = useState<string>("12");
  const [anoBase, setAnoBase] = useState<string>("2025");

  const [dataReferencia, setDataReferencia] = useState("");
  const [valorPagoNotificacao, setValorPagoNotificacao] = useState("");
  const [multaNotificacao, setMultaNotificacao] = useState("");
  const [descontoNotificacao, setDescontoNotificacao] = useState("");
  const [prazoDias, setPrazoDias] = useState("15 (quinze)");
  const [cidadeData, setCidadeData] = useState(`Belém, ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`);
  const [itensNotificacao, setItensNotificacao] = useState<{descricao: string, valor: string}[]>([
    { descricao: "", valor: "" }
  ]);

  const handleDataChange = (value: string, setter: (val: string) => void) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 2) v = v.substring(0, 2) + "/" + v.substring(2);
    if (v.length > 5) v = v.substring(0, 5) + "/" + v.substring(5, 9);
    setter(v);
  };

  const handleMoedaChange = (value: string, setter: (val: string) => void) => {
    let v = value.replace(/\D/g, "");
    if (v === "") {
      setter("");
      return;
    }
    v = (parseInt(v, 10) / 100).toFixed(2);
    v = v.replace(".", ",");
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    setter(v);
  };

  useEffect(() => {
    async function carregarPendenciasAluno() {
      if (documentoAtivo === 'notificacao' && alunoSelecionado) {
        const { data } = await supabase.from('historico_pagamentos')
          .select('*')
          .eq('aluno_id', alunoSelecionado.id)
          .in('status', ['pendente', 'parcial', 'atrasado'])
          .order('data_pagamento', { ascending: true });

        if (data && data.length > 0) {
          const pendenciasMapeadas = data.map(p => {
            const restante = clean(p.valor_total) - clean(p.valor_pago);
            let valString = restante.toFixed(2).replace(".", ",");
            valString = valString.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
            return {
              descricao: p.descricao ? p.descricao.toUpperCase() : "DÉBITO PENDENTE",
              valor: valString
            };
          });
          setItensNotificacao(pendenciasMapeadas);
        } else {
          setItensNotificacao([{ descricao: "", valor: "" }]);
        }
      }
    }
    carregarPendenciasAluno();
  }, [documentoAtivo, alunoSelecionado]);

  const selecionarResponsavel = (aluno: any, tipo: number) => {
    if (tipo === 1) {
      setResponsavelEscolhido({ 
        nome: aluno.responsavel || "", 
        cpf: aluno.cpf_responsavel || "",
        telefone: aluno.whatsapp || "" 
      });
    } else {
      setResponsavelEscolhido({ 
        nome: aluno.responsavel2 || aluno.responsavel_2_nome || "", 
        cpf: aluno.cpf_responsavel2 || aluno.cpf_responsavel_2 || "",
        telefone: aluno.responsavel_2_contato || ""
      });
    }
  };

  const enviarWhatsApp = (aluno: any, resp: any) => {
    if (!resp.telefone) {
      alert("Responsável não possui telefone cadastrado!");
      return;
    }

    const numeroLimpo = resp.telefone.replace(/\D/g, "");
    let nomeDoc = "";
    if (documentoAtivo === 'matricula') nomeDoc = "Declaração de Matrícula";
    else if (documentoAtivo === 'quitacao') nomeDoc = "Quitação de Imposto de Renda";
    else if (documentoAtivo === 'ressalva') nomeDoc = "Ressalva (Transferência)";
    else if (documentoAtivo === 'notificacao') nomeDoc = "Notificação Extrajudicial";
    
    const mensagem = `Olá! Aqui é da *Escola ABC do Park*. Segue a ${nomeDoc} de *${aluno.nome}*. Por favor, salve o arquivo PDF que acabei de gerar para você.`;
    
    const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  };

  const executarGeracaoNotificacao = async () => {
    const itensConvertidos = itensNotificacao.map(i => ({
        descricao: i.descricao,
        valor: parseFloat(i.valor.replace(/\./g, '').replace(',', '.')) || 0
    }));

    const dados = {
      nomeResponsavel: responsavelEscolhido.nome,
      cpfResponsavel: responsavelEscolhido.cpf,
      enderecoResponsavel: alunoSelecionado.endereco || "Endereço não cadastrado",
      dataReferencia: dataReferencia,
      valorPago: parseFloat(valorPagoNotificacao.replace(/\./g, '').replace(',', '.')) || 0,
      multa: parseFloat(multaNotificacao.replace(/\./g, '').replace(',', '.')) || 0,
      desconto: parseFloat(descontoNotificacao.replace(/\./g, '').replace(',', '.')) || 0,
      itens: itensConvertidos,
      prazoDias: prazoDias,
      cidadeData: cidadeData
    };
    await gerarNotificacaoExtrajudicial(dados);
  };

  return (
    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxWidth: '600px', width: '100%', overflowX: 'auto' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '20px' }}>
        {documentoAtivo === 'matricula' && 'Gerar Declaração de Matrícula'}
        {documentoAtivo === 'quitacao' && 'Gerar Quitação de Imposto de Renda'}
        {documentoAtivo === 'ressalva' && 'Gerar Ressalva'}
        {documentoAtivo === 'notificacao' && 'Gerar Notificação Extrajudicial'}
      </h2>
      
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>1. Selecione o Aluno</label>
      <select 
        value={alunoSelecionado?.id || ""}
        onChange={(e) => {
          const id = e.target.value;
          const selecionado = alunos.find(a => String(a.id) === String(id));
          setAlunoSelecionado(selecionado || null);
          setResponsavelEscolhido({ nome: "", cpf: "", telefone: "" });
        }}
        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', outline: 'none', fontSize: '14px', color: '#1e293b' }}
      >
        <option value="">Escolha um aluno na lista...</option>
        {alunos.map(aluno => (
          <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>
        ))}
      </select>

      {alunoSelecionado && (
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
          
          {documentoAtivo === 'quitacao' && (
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>ANO BASE</label>
                <input type="text" value={anoBase} onChange={(e) => setAnoBase(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>MENSALIDADE (R$)</label>
                  <input type="text" value={valorMensalidade} onChange={(e) => setValorMensalidade(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>MESES PAGOS</label>
                  <input type="text" value={mesesPagos} onChange={(e) => setMesesPagos(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                </div>
              </div>
            </div>
          )}

          {documentoAtivo === 'notificacao' && (
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>DATA DE REFERÊNCIA</label>
                  <input type="text" placeholder="Ex: 28/03/2023" value={dataReferencia} onChange={(e) => handleDataChange(e.target.value, setDataReferencia)} maxLength={10} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>VALOR JÁ PAGO (R$)</label>
                  <input type="text" placeholder="Ex: 50,00" value={valorPagoNotificacao} onChange={(e) => handleMoedaChange(e.target.value, setValorPagoNotificacao)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>MULTA / JUROS (R$)</label>
                  <input type="text" placeholder="Ex: 10,00" value={multaNotificacao} onChange={(e) => handleMoedaChange(e.target.value, setMultaNotificacao)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>DESCONTO (R$)</label>
                  <input type="text" placeholder="Ex: 5,00" value={descontoNotificacao} onChange={(e) => handleMoedaChange(e.target.value, setDescontoNotificacao)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>PRAZO PARA PAGAMENTO</label>
                  <input type="text" placeholder="Ex: 15 (quinze)" value={prazoDias} onChange={(e) => setPrazoDias(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>LOCAL E DATA DA EMISSÃO</label>
                  <input type="text" value={cidadeData} onChange={(e) => setCidadeData(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>ITENS DEVIDOS</label>
                {itensNotificacao.map((item, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input 
                      type="text" 
                      placeholder="Descrição (ex: Mensalidade Maio)" 
                      value={item.descricao} 
                      onChange={(e) => {
                        const newItens = [...itensNotificacao];
                        newItens[index].descricao = e.target.value;
                        setItensNotificacao(newItens);
                      }}
                      style={{ flex: 2, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }}
                    />
                    <input 
                      type="text" 
                      placeholder="Valor (R$)" 
                      value={item.valor} 
                      onChange={(e) => {
                        const newItens = [...itensNotificacao];
                        handleMoedaChange(e.target.value, (val) => {
                            newItens[index].valor = val;
                            setItensNotificacao(newItens);
                        });
                      }}
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const newItens = itensNotificacao.filter((_, i) => i !== index);
                        setItensNotificacao(newItens);
                      }} 
                      style={{ padding: '0 15px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      X
                    </button>
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={() => setItensNotificacao([...itensNotificacao, { descricao: "", valor: "" }])} 
                  style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#475569' }}
                >
                  + Adicionar Item
                </button>
              </div>
            </div>
          )}

          {(documentoAtivo === 'matricula' || documentoAtivo === 'ressalva') && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>2. Qual o sexo do aluno?</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setSexoAluno("M")} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: sexoAluno === "M" ? '2px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: sexoAluno === "M" ? '#eff6ff' : 'white', fontWeight: 'bold', cursor: 'pointer', color: '#1e293b' }}>Masculino</button>
                <button type="button" onClick={() => setSexoAluno("F")} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: sexoAluno === "F" ? '2px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: sexoAluno === "F" ? '#eff6ff' : 'white', fontWeight: 'bold', cursor: 'pointer', color: '#1e293b' }}>Feminino</button>
              </div>
            </div>
          )}

          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>
            {documentoAtivo === 'notificacao' ? '2. Qual responsável será notificado?' : '3. Qual responsável assinará?'}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2].map((tipo) => {
              const nome = tipo === 1 ? alunoSelecionado.responsavel : (alunoSelecionado.responsavel2 || alunoSelecionado.responsavel_2_nome);
              if (!nome) return null;
              const isSelected = responsavelEscolhido.nome === nome;
              return (
                <button key={tipo} type="button" onClick={() => selecionarResponsavel(alunoSelecionado, tipo)} style={{ textAlign: 'left', padding: '15px', borderRadius: '12px', border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: isSelected ? '#eff6ff' : 'white', cursor: 'pointer' }}>
                  <span style={{ fontWeight: 'bold', display: 'block', color: '#1e293b', fontSize: '14px' }}>{nome}</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{tipo === 1 ? (alunoSelecionado.parentesco_1 || "Principal") : (alunoSelecionado.parentesco_2 || "Responsável 2")}</span>
                </button>
              );
            })}
          </div>

          {responsavelEscolhido.nome && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '30px' }}>
              <button 
                type="button"
                onClick={() => {
                  if(documentoAtivo === 'matricula') gerarPDFMatricula(alunoSelecionado, responsavelEscolhido, sexoAluno);
                  else if(documentoAtivo === 'quitacao') {
                    const vMensalidade = parseFloat(valorMensalidade.replace(/\./g, '').replace(',', '.'));
                    gerarPDFImpostoRenda(alunoSelecionado, responsavelEscolhido, vMensalidade, parseInt(mesesPagos), anoBase);
                  } else if(documentoAtivo === 'ressalva') {
                    gerarPDFRessalva(alunoSelecionado, sexoAluno);
                  } else if(documentoAtivo === 'notificacao') {
                    executarGeracaoNotificacao();
                  }
                }}
                style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                GERAR PDF AGORA
              </button>
              
              <button 
                type="button"
                onClick={() => {
                  if(documentoAtivo === 'matricula') gerarPDFMatricula(alunoSelecionado, responsavelEscolhido, sexoAluno);
                  else if(documentoAtivo === 'quitacao') {
                    const vMensalidade = parseFloat(valorMensalidade.replace(/\./g, '').replace(',', '.'));
                    gerarPDFImpostoRenda(alunoSelecionado, responsavelEscolhido, vMensalidade, parseInt(mesesPagos), anoBase);
                  } else if(documentoAtivo === 'ressalva') {
                    gerarPDFRessalva(alunoSelecionado, sexoAluno);
                  } else if(documentoAtivo === 'notificacao') {
                    executarGeracaoNotificacao();
                  }
                  enviarWhatsApp(alunoSelecionado, responsavelEscolhido);
                }}
                style={{ width: '100%', padding: '16px', backgroundColor: '#22c55e', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                ENVIAR VIA WHATSAPP 📱
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}