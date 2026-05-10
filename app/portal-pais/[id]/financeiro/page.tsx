"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { Wallet, QrCode, Calendar, CheckCircle2, Clock, PartyPopper } from "lucide-react";

export default function FinanceiroPage() {
  const { id } = useParams();
  const [aluno, setAluno] = useState<any>(null);
  const [mensalidades, setMensalidades] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const VALOR_NORMAL = 450.00;
  const VALOR_COM_MULTA = 550.00;
  const CHAVE_PIX = "escolaabcdopark@gmail.com";

  useEffect(() => {
    async function buscarDados() {
      if (!id) return;
      const { data: a } = await supabase.from("alunos").select("nome").eq("id", id).single();
      if (a) setAluno(a);

      // Gerando as 12 mensalidades de 2026
      const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];

      const hoje = new Date();

      const listaMensalidades = meses.map((mes, index) => {
        const vencimento = new Date(2026, index, 10); // Vence todo dia 10
        const limiteMulta = new Date(vencimento);
        limiteMulta.setDate(vencimento.getDate() + 5);

        // Define se já passou do prazo de 5 dias
        const aplicarMulta = hoje > limiteMulta;
        
        return {
          id: index + 1,
          mes,
          vencimento: vencimento.toISOString().split('T')[0],
          valor: aplicarMulta ? VALOR_COM_MULTA : VALOR_NORMAL,
          status: index < 2 ? "pago" : "pendente", // Simulando jan/fev pagos
          atrasado: aplicarMulta
        };
      });

      setMensalidades(listaMensalidades);
      setEventos([
        { id: 1, titulo: "Gincana 2026", valor: 50.00, status: "pago" },
        { id: 2, titulo: "Fardamento Novo", valor: 120.00, status: "pendente" },
      ]);

      setCarregando(false);
    }
    buscarDados();
  }, [id]);

  const handlePagarPix = (valor: number, descricao: string) => {
    // Tenta abrir o app do banco via link universal ou copia a chave
    const mensagem = `Pagamento Escola ABC do Park: ${descricao}`;
    alert(`Chave PIX: ${CHAVE_PIX}\nValor: R$ ${valor.toFixed(2)}\n\nA chave foi exibida. No mobile, alguns bancos abrem automaticamente ao clicar.`);
    // Opcional: Implementar biblioteca de geração de QR Code dinâmico aqui
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (carregando) return <div className="p-10 text-center text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-widest">Sincronizando extrato...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full">
      <header className="mb-10 px-2">
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">Financeiro</h1>
        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-2 italic">Acompanhamento: <span className="text-indigo-600 font-black">{aluno?.nome}</span></p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start px-2">
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><Wallet size={20} /></div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Mensalidades 2026</h2>
          </div>

          <div className="space-y-3">
            {mensalidades.map((m) => (
              <div key={m.id} className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-[1.8rem] border transition-all ${m.status === 'pago' ? 'bg-slate-50/50 border-slate-100 opacity-80' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${m.atrasado && m.status !== 'pago' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-700 uppercase">{m.mes}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Vencimento: 10/{m.id.toString().padStart(2, '0')}/2026</p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 mt-4 md:mt-0">
                  <div className="text-right">
                    <p className={`text-xs font-black ${m.atrasado && m.status !== 'pago' ? 'text-rose-600' : 'text-slate-800'}`}>{formatarMoeda(m.valor)}</p>
                    <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-md ${m.status === 'pago' ? 'bg-emerald-50 text-emerald-600' : (m.atrasado ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')}`}>
                      {m.status === 'pago' ? 'Liquidado' : (m.atrasado ? 'Vencido' : 'Em Aberto')}
                    </span>
                  </div>

                  {m.status !== "pago" && (
                    <button 
                      onClick={() => handlePagarPix(m.valor, `Mensalidade ${m.mes}`)}
                      className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 shadow-lg active:scale-95 transition-all"
                    >
                      <QrCode size={14} /> Pagar PIX
                    </button>
                  )}
                  {m.status === "pago" && <CheckCircle2 size={24} className="text-emerald-500 mr-2" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-amber-50 p-3 rounded-2xl text-amber-600"><PartyPopper size={20} /></div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Eventos Extras</h2>
            </div>
            <div className="space-y-3">
              {eventos.map((e) => (
                <div key={e.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase">{e.titulo}</p>
                    <p className="text-xs font-bold text-slate-800">{formatarMoeda(e.valor)}</p>
                  </div>
                  {e.status === "pago" ? <CheckCircle2 size={16} className="text-emerald-500" /> : 
                    <button onClick={() => handlePagarPix(e.valor, e.titulo)} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-[8px] font-black uppercase">Pagar</button>
                  }
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-center">
            <Clock size={24} className="mx-auto mb-4 text-indigo-400" />
            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-6 leading-relaxed">Dúvidas? Fale com nosso financeiro via WhatsApp.</p>
            <button className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all">Suporte Financeiro</button>
          </div>
        </div>
      </div>
    </div>
  );
}