"use client";

interface PainelAuditoriaProps {
  alunos: any[];
  listaReceitasDetalhada: any[];
}

export function PainelAuditoria({ alunos, listaReceitasDetalhada }: PainelAuditoriaProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px", marginBottom: "25px" }}>
      
      {/* CARD VERDE: SALDO CREDOR */}
      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "18px", borderLeft: "5px solid #16a34a", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
        <h4 style={{ margin: "0 0 10px 0", color: "#16a34a", fontSize: "13px", fontWeight: "bold" }}>🟢 ALUNOS COM SALDO CREDOR (ADIANTAMENTOS)</h4>
        <div style={{ maxHeight: "120px", overflowY: "auto", fontSize: "12px" }}>
          {alunos.filter(a => parseFloat(a.saldo_credito) > 0).length > 0 ? (
            alunos.filter(a => parseFloat(a.saldo_credito) > 0).map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontWeight: "600" }}>{a.nome}</span>
                <span style={{ color: "#16a34a", fontWeight: "bold" }}>+ R$ {parseFloat(a.saldo_credito).toFixed(2)}</span>
              </div>
            ))
          ) : <p style={{ color: "#94a3b8", margin: 0, fontStyle: "italic" }}>Nenhum adiantamento retido.</p>}
        </div>
      </div>

      {/* CARD VERMELHO: OBRIGAÇÕES EM ABERTO */}
      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "18px", borderLeft: "5px solid #dc2626", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
        <h4 style={{ margin: "0 0 10px 0", color: "#dc2626", fontSize: "13px", fontWeight: "bold" }}>🔴 OBRIGAÇÕES EM ABERTO / AMORTIZAÇÕES PENDENTES</h4>
        <div style={{ maxHeight: "120px", overflowY: "auto", fontSize: "12px" }}>
          {listaReceitasDetalhada.filter(r => r.status === "parcial" || r.status === "pendente").length > 0 ? (
            listaReceitasDetalhada.filter(r => r.status === "parcial" || r.status === "pendente").map(r => {
              const nomeAl = alunos.find(a => a.id === r.aluno_id)?.nome || "Aluno Removido";
              const Restante = parseFloat(r.valor_total) - parseFloat(r.valor_pago || 0);
              return (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div>
                    <span style={{ fontWeight: "600", display: "block" }}>{nomeAl}</span>
                    <small style={{ color: "#64748b" }}>{r.descricao}</small>
                  </div>
                  <span style={{ color: "#dc2626", fontWeight: "bold", alignSelf: "center" }}>- R$ {Restante.toFixed(2)}</span>
                </div>
              );
            })
          ) : <p style={{ color: "#94a3b8", margin: 0, fontStyle: "italic" }}>Nenhum débito pendente detectado.</p>}
        </div>
      </div>

    </div>
  );
}