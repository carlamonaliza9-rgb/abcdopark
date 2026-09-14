import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Ajuste o caminho do seu cliente Prisma se necessário
import { dispararNotificacaoTurma } from "@/lib/onesignal";
export const dynamic = 'force-dynamic';

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
