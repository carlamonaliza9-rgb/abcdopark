import { NextResponse } from "next/server";
import { dispararNotificacaoPorCargo } from "@/lib/onesignal";

// Essa rota será acessada pelo sistema automático (Cron)
export async function GET(request: Request) {
  try {
    // Dispara a notificação para todos que têm a tag cargo = "professor"
    await dispararNotificacaoPorCargo(
      "professor",
      "⏰ Lembrete de Agenda e Diário",
      "Olá Professor(a)! Não se esqueça de preencher a agenda e o diário das suas turmas antes do fim do expediente."
    );

    return NextResponse.json({ success: true, message: "Lembrete enviado aos professores!" });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao disparar lembrete." }, { status: 500 });
  }
}