"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminAcordosPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [acordosAgrupados, setAcordosAgrupados] = useState<any[]>([]);
  const [filtroNome, setFiltroNome] = useState("");

  // Controle de expansão do Acordeão (para ver as parcelas)
  const [alunoExpandido, setAlunoExpandido] = useState<string | null>(null);

  // Controle de Observações
  const [editandoObs, setEditandoObs] = useState<string | null>(null);
  const [textoObs, setTextoObs] = useState("");

  useEffect(() => {
    verificarAcessoECarregar();
  }, []);

  async function verificarAcessoECarregar() {
    setCarregando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      const ehAutorizado = user.email === 'carlamonaliza9@gmail.com' || user.email === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin' || perfil?.cargo === 'Direção';
      
      // Se não for autorizado, devolve para a página inicial do admin
      if (!ehAutorizado) return router.push("/admin");

      await carregarDados();
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }

  async function carregarDados() {
    const hoje = new Date().toISOString().split('T')[0];

    // 1. Busca todos os alunos
    const { data: listaAlunos } = await supabase.from('alunos').select('*');
    
    // 2. Busca todo o histórico financeiro que seja do tipo "acordo"
    const { data: todosAcordos } = await supabase.from('historico_pagamentos')
      .select('*')
      .eq('tipo', 'acordo')
      .order('data_pagamento', { ascending: true });

    if (listaAlunos && todosAcordos) {
      // 3. Agrupa as parcelas por Aluno
      const agrupados = listaAlunos.map(aluno => {
        const parcelasDoAluno = todosAcordos.filter(a => a.aluno_id === aluno.id);
        
        if (parcelasDoAluno.length === 0) return null; // Ignora alunos sem acordo

        // Atualiza status dinamicamente para "atrasado" se passou da data e não tá pago
        const parcelasAtualizadas = parcelasDoAluno.map(p => {
            let statusReal = p.status;
            if (p.status !== 'pago' && p.data_pagamento < hoje) {
                statusReal = 'atrasado';
            }
            return { ...p, status: statusReal };
        });

        const valorTotal = parcelasAtualizadas.reduce((acc, p) => acc + parseFloat(p.valor_total || 0), 0);
        const valorPago = parcelasAtualizadas.filter(p => p.status === 'pago').reduce((acc, p) => acc + parseFloat(p.valor_pago || p.valor_total), 0);
        
        // Pega a data da primeira parcela para simbolizar quando o acordo começou
        const dataInicio = parcelasAtualizadas[0]?.created_at?.split('T')[0] || parcelasAtualizadas[0]?.data_pagamento;

        // Tenta buscar o responsável pelo acordo
        const responsavel = parcelasAtualizadas[0]?.detalhes_metodos?.criado_por || "Sistema/Admin";

        return {
          ...aluno,
          parcelas: parcelasAtualizadas,
          valorTotal,
          valorPago,
          dataInicio,
          responsavel,
          progresso: Math.round((valorPago / valorTotal) * 100) || 0
        };
      }).filter(Boolean); // Remove os nulos

      setAcordosAgrupados(agrupados as any[]);
    }
  }

  async function salvarObservacao(alunoId: string) {
    // Salva a observação diretamente no cadastro do aluno
    await supabase.from('alunos').update({ observacoes_financeiras: textoObs }).eq('id', alunoId);
    
    const novosDados = acordosAgrupados.map(a => 
      a.id === alunoId ? { ...a, observacoes_financeiras: textoObs } : a
    );
    setAcordosAgrupados(novosDados);
    setEditandoObs(null);
  }

  const toggleExpandir = (id: string) => {
    setAlunoExpandido(alunoExpandido === id ? null : id);
  };

  const dadosFiltrados = acordosAgrupados.filter(a => 
    a.nome.toLowerCase().includes(filtroNome.toLowerCase())
  );

  if (carregando) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse">Carregando Acordos...</div>;

  return (
    <div className="w-full bg-slate-50 min-h-screen p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter italic">🤝 Gestão de Acordos</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Dívida Ativa e Parcelamentos Cadastrados</p>
          </div>
          <input
            type="text"
            placeholder="Buscar aluno..."
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
            className="w-full sm:w-64 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors text-sm"
          />
        </div>

        {/* Lista de Acordos */}
        <div className="space-y-4">
          {dadosFiltrados.length === 0 ? (
            <div className="text-center p-10 text-slate-400 font-bold">Nenhum acordo encontrado.</div>
          ) : (
            dadosFiltrados.map((aluno) => (
              <div key={aluno.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all">
                
                {/* Cabeçalho do Card (Resumo do Aluno) */}
                <div 
                  className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 cursor-pointer hover:bg-slate-50"
                  onClick={() => toggleExpandir(aluno.id)}
                >
                  <div className="flex-1 w-full flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl">
                      {aluno.nome.charAt(0)}
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-slate-800">{aluno.nome}</h2>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold mt-1">
                        <span>📅 Início: {aluno.dataInicio?.split('-').reverse().join('/')}</span>
                        <span>|</span>
                        <span>👤 Fechado por: {aluno.responsavel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end min-w-[200px]">
                    <span className="text-sm font-bold text-slate-500 mb-1">
                      Pago: <span className="text-emerald-500">R$ {aluno.valorPago.toFixed(2)}</span> / R$ {aluno.valorTotal.toFixed(2)}
                    </span>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className="bg-emerald-400 h-2 rounded-full transition-all" 
                        style={{ width: `${aluno.progresso}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Área Expandida (Parcelas e Observações) */}
                {alunoExpandido === aluno.id && (
                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row gap-8">
                    
                    {/* Lista de Parcelas */}
                    <div className="flex-1 space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Cronograma de Parcelas</h3>
                      {aluno.parcelas.map((parcela: any, idx: number) => (
                        <div key={parcela.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-sm">
                          <span className="font-bold text-slate-600">Parcela {idx + 1}</span>
                          <span className="text-slate-500">{parcela.data_pagamento?.split('-').reverse().join('/')}</span>
                          <span className="font-bold text-slate-700">R$ {parseFloat(parcela.valor_total).toFixed(2)}</span>
                          
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            parcela.status === 'pago' ? 'bg-emerald-100 text-emerald-600' :
                            parcela.status === 'atrasado' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-600'
                          }`}>
                            {parcela.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Observações */}
                    <div className="w-full md:w-1/3 flex flex-col">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Observações do Acordo</h3>
                      
                      {editandoObs === aluno.id ? (
                        <div className="flex flex-col gap-2 h-full">
                          <textarea
                            className="w-full flex-1 p-3 rounded-xl border border-indigo-200 outline-none focus:ring-2 ring-indigo-100 text-sm resize-none bg-white"
                            value={textoObs}
                            onChange={(e) => setTextoObs(e.target.value)}
                            placeholder="Digite os detalhes do acordo, promessas de pagamento, etc..."
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditandoObs(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg">Cancelar</button>
                            <button onClick={() => salvarObservacao(aluno.id)} className="px-4 py-2 text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg shadow-md">Salvar Obs</button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="flex-1 p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 cursor-text hover:border-indigo-300 transition-colors whitespace-pre-wrap relative group min-h-[100px]"
                          onClick={() => { setTextoObs(aluno.observacoes_financeiras || ""); setEditandoObs(aluno.id); }}
                        >
                          {aluno.observacoes_financeiras || <span className="text-slate-400 italic">Nenhuma observação. Clique para adicionar...</span>}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            ✏️
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}