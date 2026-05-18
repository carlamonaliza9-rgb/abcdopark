"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface ModalTaxasProps {
  aberto: boolean;
  onFechar: () => void;
  alunos: any[];
  carregarDados: () => void;
}

export function ModalTaxas({ aberto, onFechar, alunos, carregarDados }: ModalTaxasProps) {
  const [anoRefTaxas, setAnoRefTaxas] = useState("Letivo 2026");
  const [precoLivroInfantil, setPrecoLivroInfantil] = useState("350.00"); 
  const [precoLivroFundamental, setPrecoLivroFundamental] = useState("480.00"); 
  const [precoTaxaMaterial, setPrecoTaxaMaterial] = useState("200.00");
  const [gerarLivrosCheck, setGerarLivrosCheck] = useState(true);
  const [gerarMaterialCheck, setGerarMaterialCheck] = useState(true);

  async function handleGerarTaxasEmLote() {
    if (!gerarLivrosCheck && !gerarMaterialCheck) {
      return alert("Selecione ao menos uma taxa para faturamento em lote.");
    }

    const confirmarGeracao = confirm(`Deseja lançar as obrigações para os ${alunos.length} alunos cadastrados no período (${anoRefTaxas})?`);
    if (!confirmarGeracao) return;

    try {
      const { data: existentes } = await supabase
        .from("historico_pagamentos")
        .select("aluno_id, descricao")
        .eq("mes_referencia", anoRefTaxas);

      const novosLancamentos: any[] = [];
      const turmasInfantil = ["Maternal", "Jardim I", "Jardim II"];

      alunos.forEach((aluno) => {
        const jaTemCobrança = (desc: string) => (existentes || []).some(e => e.aluno_id === aluno.id && e.descricao.toLowerCase() === desc.toLowerCase());

        // A) Lançamento de Livros por Segmentação de Turma
        if (gerarLivrosCheck) {
          const ehInfantil = turmasInfantil.some(t => (aluno.turma || "").toLowerCase().includes(t.toLowerCase()));
          const valorLivro = ehInfantil ? parseFloat(precoLivroInfantil) : parseFloat(precoLivroFundamental);
          const descLivro = `Taxa de Livros Didáticos (${ehInfantil ? 'Ed. Infantil' : 'Ens. Fundamental'})`;

          if (valorLivro > 0 && !jaTemCobrança(descLivro)) {
            novosLancamentos.push({
              aluno_id: aluno.id,
              tipo: "livro",
              descricao: descLivro,
              valor_total: valorLivro,
              valor_pago: 0,
              status: "pendente",
              data_pagamento: null,
              mes_referencia: anoRefTaxas
            });
          }
        }

        // B) Lançamento de Material Unificado
        if (gerarMaterialCheck) {
          const valorMaterial = parseFloat(precoTaxaMaterial);
          const descMaterial = "Taxa de Material Escolar Anual";

          if (valorMaterial > 0 && !jaTemCobrança(descMaterial)) {
            novosLancamentos.push({
              aluno_id: aluno.id,
              tipo: "material",
              descricao: descMaterial,
              valor_total: valorMaterial,
              valor_pago: 0,
              status: "pendente",
              data_pagamento: null,
              mes_referencia: anoRefTaxas
            });
          }
        }
      });

      if (novosLancamentos.length > 0) {
        const { error } = await supabase.from("historico_pagamentos").insert(novosLancamentos);
        if (error) throw error;
        alert(`Sucesso! Foram injetados ${novosLancamentos.length} novos débitos pendentes de taxas no banco.`);
        carregarDados();
        onFechar();
      } else {
        alert("Todos os alunos já possuem essas taxas fixadas para este período letivo.");
      }
    } catch (e: any) {
      alert("Erro ao aplicar faturamento global: " + e.message);
    }
  }

  if (!aberto) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '95%', maxWidth: '500px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a8a', margin: '0 0 15px 0' }}>📦 Faturamento de Taxas Anuais Letivas</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>PERÍODO DE REFERÊNCIA</label>
            <input type="text" value={anoRefTaxas} onChange={(e) => setAnoRefTaxas(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 'bold' }} />
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a' }}>1. LIVROS DIDÁTICOS</span>
              <input type="checkbox" checked={gerarLivrosCheck} onChange={(e) => setGerarLivrosCheck(e.target.checked)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', opacity: gerarLivrosCheck ? 1 : 0.5 }}>
              <div>
                <small style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569' }}>MATERNAL AO JARDIM II (R$)</small>
                <input type="number" disabled={!gerarLivrosCheck} value={precoLivroInfantil} onChange={(e) => setPrecoLivroInfantil(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }} />
              </div>
              <div>
                <small style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569' }}>1º AO 5º ANO (R$)</small>
                <input type="number" disabled={!gerarLivrosCheck} value={precoLivroFundamental} onChange={(e) => setPrecoLivroFundamental(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a' }}>2. TAXA DE MATERIAL ANUAL</span>
              <input type="checkbox" checked={gerarMaterialCheck} onChange={(e) => setGerarMaterialCheck(e.target.checked)} />
            </div>
            <div style={{ opacity: gerarMaterialCheck ? 1 : 0.5 }}>
              <small style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569' }}>VALOR UNIFICADO PARA TODOS OS ALUNOS (R$)</small>
              <input type="number" disabled={!gerarMaterialCheck} value={precoTaxaMaterial} onChange={(e) => setPrecoTaxaMaterial(e.target.value)} style={{ width: '150px', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', display: 'block' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
          <button onClick={onFechar} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontWeight: 'bold', cursor: 'pointer' }}>CANCELAR</button>
          <button onClick={handleGerarTaxasEmLote} style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>LANÇAR COBRANÇAS 📦</button>
        </div>
      </div>
    </div>
  );
}