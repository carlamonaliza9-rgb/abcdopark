import { NextResponse } from 'next/server';

export async function GET() {
  // O .trim() remove espaços invisíveis que podem quebrar a chave
  const chave = process.env.ONESIGNAL_REST_API_KEY?.trim(); 
  const app_id = process.env.ONESIGNAL_APP_ID;

  console.log("DEBUG_CHAVE_LIMPA:", chave ? chave.substring(0, 4) + "..." : "VAZIA");

  const res = await fetch(`https://onesignal.com/api/v1/apps/${app_id}`, {
    method: "GET",
    headers: {
      // OneSignal exige "Basic" no cabeçalho
      "Authorization": `Basic ${chave}`, 
      "Content-Type": "application/json"
    }
  });

  const data = await res.json();
  
  return NextResponse.json({ 
    status: res.status, 
    ok: res.ok, 
    data: data 
  });
}