import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Ajuste o caminho do seu cliente Prisma se necessário
import { dispararNotificacaoTurma } from "@/lib/onesignal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { turmaId, conteudo, professorId } = body;

    // Validação básica dos dados recebidos do formulário do professor
    if (!turmaId || !conteudo || !professorId) {
      return NextResponse.json(
        { error: "Por favor, preencha todos os campos obrigatórios." },
        { status: 400 }
      );
    }

    // 1. Busca os detalhes da turma para obter o nome correto (usado como Tag no OneSignal)
    const turma = await prisma.turma.findUnique({
      where: { id: turmaId },
    });

    if (!turma) {
      return NextResponse.json(
        { error: "A turma selecionada não foi encontrada no sistema." },
        { status: 404 }
      );
    }

    // 2. Cria o registro da agenda no banco de dados (Supabase via Prisma)
    const novaAgenda = await prisma.$queryRaw`
      INSERT INTO agenda ("turmaId", "conteudo", "professorId")
      VALUES (${turmaId}, ${conteudo}, ${professorId})
      RETURNING *;
    `;

    // 3. Com o banco atualizado, aciona o OneSignal usando o nome da turma como filtro
    await dispararNotificacaoTurma(
      turma.nome, // Passa o nome da turma (ex: "Maternal A" ou "maternal_a")
      "📘 Nova Atualização na Agenda!",
      `A agenda da turma ${turma.nome} acabou de ser atualizada. Toque para conferir.`
    );

    return NextResponse.json({
      success: true,
      message: "Agenda registada e notificações enviadas com sucesso!",
      data: novaAgenda,
    });

  } catch (error) {
    console.error("Erro na rota de API da agenda:", error);
    return NextResponse.json(
      { error: "Ocorreu um erro interno ao salvar a agenda." },
      { status: 500 }
    );
  }
}
export async function dispararNotificacaoPorCargo(
  cargo: string, // Ex: "professor"
  titulo: string, 
  mensagem: string
) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) return null;

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      // Aqui a mágica acontece: ele busca quem tem a tag cargo = professor
      filters: [
        { field: "tag", key: "cargo", relation: "=", value: cargo }
      ],
      headings: { en: titulo, pt: titulo },
      contents: { en: mensagem, pt: mensagem },
    }),
  };

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", options);
    return await response.json();
  } catch (error) {
    console.error("Erro ao notificar cargo:", error);
    return null;
  }
}