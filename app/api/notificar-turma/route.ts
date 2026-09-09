import { NextResponse } from "next/server";
import { dispararNotificacaoTurma } from "@/lib/onesignal";
import { usuarioServidorEhEquipe } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    if (!(await usuarioServidorEhEquipe())) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { turma, titulo, mensagem } = await request.json();

    if (
      typeof turma !== "string" ||
      typeof titulo !== "string" ||
      typeof mensagem !== "string" ||
      !turma.trim() ||
      !titulo.trim() ||
      !mensagem.trim() ||
      turma.length > 100 ||
      titulo.length > 120 ||
      mensagem.length > 500
    ) {
      return NextResponse.json(
        { error: "Dados incompletos para enviar a notificação." },
        { status: 400 }
      );
    }

    // Chama o serviço do OneSignal que já criamos
    await dispararNotificacaoTurma(turma.trim(), titulo.trim(), mensagem.trim());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro na rota de notificação:", error);
    return NextResponse.json(
      { error: "Falha interna ao disparar notificação." },
      { status: 500 }
    );
  }
}
