import { NextResponse } from "next/server";
import { dispararNotificacaoTurma } from "@/lib/onesignal";

export async function POST(request: Request) {
  try {
    const { turma, titulo, mensagem } = await request.json();

    if (!turma || !titulo || !mensagem) {
      return NextResponse.json(
        { error: "Dados incompletos para enviar a notificação." },
        { status: 400 }
      );
    }

    // Chama o serviço do OneSignal que já criamos
    await dispararNotificacaoTurma(turma, titulo, mensagem);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro na rota de notificação:", error);
    return NextResponse.json(
      { error: "Falha interna ao disparar notificação." },
      { status: 500 }
    );
  }
}