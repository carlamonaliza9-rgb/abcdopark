"use client";

import { supabase } from "@/lib/supabase";
import {
  normalizarCargo,
  temPermissao,
  type AppPermission,
  type AppRole,
} from "./permissions";

export type ContextoAcessoCliente = {
  userId: string;
  email: string;
  cargo: AppRole;
};

export async function obterContextoAcessoCliente(): Promise<ContextoAcessoCliente | null> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user?.email) return null;

  const { data: perfil, error } = await supabase
    .from("perfis")
    .select("cargo")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  const cargo = normalizarCargo(perfil?.cargo);
  if (!cargo) return null;

  return { userId: user.id, email: user.email, cargo };
}

function criarCampoSenha(titulo: string, descricao: string): Promise<string | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", titulo);
    Object.assign(dialog.style, {
      border: "0",
      borderRadius: "18px",
      padding: "0",
      width: "min(92vw, 430px)",
      boxShadow: "0 24px 80px rgba(15, 23, 42, .3)",
    });

    const form = document.createElement("form");
    form.method = "dialog";
    Object.assign(form.style, { padding: "24px", fontFamily: "system-ui, sans-serif" });

    const heading = document.createElement("h2");
    heading.textContent = titulo;
    Object.assign(heading.style, { margin: "0 0 8px", fontSize: "20px", color: "#0f172a" });

    const texto = document.createElement("p");
    texto.textContent = descricao;
    Object.assign(texto.style, { margin: "0 0 18px", color: "#475569", lineHeight: "1.45" });

    const label = document.createElement("label");
    label.textContent = "Confirme com a senha da sua própria conta";
    Object.assign(label.style, { display: "block", marginBottom: "6px", fontWeight: "700", color: "#334155" });

    const input = document.createElement("input");
    input.type = "password";
    input.autocomplete = "current-password";
    input.required = true;
    Object.assign(input.style, {
      boxSizing: "border-box",
      width: "100%",
      border: "1px solid #cbd5e1",
      borderRadius: "10px",
      padding: "12px",
      marginBottom: "18px",
      fontSize: "16px",
    });

    const botoes = document.createElement("div");
    Object.assign(botoes.style, { display: "flex", justifyContent: "flex-end", gap: "10px" });

    const cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.textContent = "Cancelar";
    Object.assign(cancelar.style, { border: "0", borderRadius: "10px", padding: "10px 14px", cursor: "pointer" });

    const confirmar = document.createElement("button");
    confirmar.type = "submit";
    confirmar.textContent = "Confirmar ação";
    Object.assign(confirmar.style, {
      border: "0",
      borderRadius: "10px",
      padding: "10px 14px",
      cursor: "pointer",
      color: "white",
      background: "#dc2626",
      fontWeight: "700",
    });

    const finalizar = (valor: string | null) => {
      dialog.close();
      dialog.remove();
      resolve(valor);
    };

    cancelar.addEventListener("click", () => finalizar(null));
    dialog.addEventListener("cancel", (evento) => {
      evento.preventDefault();
      finalizar(null);
    });
    form.addEventListener("submit", (evento) => {
      evento.preventDefault();
      finalizar(input.value);
    });

    botoes.append(cancelar, confirmar);
    form.append(heading, texto, label, input, botoes);
    dialog.append(form);
    document.body.append(dialog);
    dialog.showModal();
    input.focus();
  });
}

export async function confirmarAcaoCritica({
  permissao,
  titulo,
  descricao,
}: {
  permissao: AppPermission;
  titulo: string;
  descricao: string;
}) {
  const contexto = await obterContextoAcessoCliente();
  if (!contexto || !temPermissao(contexto.cargo, permissao)) {
    window.alert("Sua conta não possui permissão para executar esta ação.");
    return false;
  }

  const senha = await criarCampoSenha(titulo, descricao);
  if (!senha) return false;

  const { error } = await supabase.auth.signInWithPassword({
    email: contexto.email,
    password: senha,
  });

  if (error) {
    window.alert("A senha da sua conta está incorreta. A operação foi cancelada.");
    return false;
  }

  await supabase.from("logs_sistema").insert({
    usuario_email: contexto.email,
    acao: "CONFIRMAÇÃO CRÍTICA",
    tabela: "seguranca_v3",
    detalhes: `${titulo}: ${descricao}`.slice(0, 1000),
  });

  return true;
}
