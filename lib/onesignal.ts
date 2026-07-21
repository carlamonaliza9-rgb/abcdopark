// lib/onesignal.ts

// 1. Função para avisar os PAIS de uma TURMA específica (ex: Agenda atualizada)
export async function dispararNotificacaoTurma(
  turma: string, 
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
      filters: [
        { field: "tag", key: "turma", relation: "=", value: turma }
      ],
      headings: { en: titulo, pt: titulo },
      contents: { en: mensagem, pt: mensagem },
    }),
  };

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", options);
    return await response.json();
  } catch (error) {
    console.error("Erro ao notificar turma:", error);
    return null;
  }
}

// 2. Função para avisar todos de um CARGO específico (ex: Lembrete para Professores)
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