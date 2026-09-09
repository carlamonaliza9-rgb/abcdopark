import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { usuarioServidorComCargo } from "@/lib/supabase/server";
import { temPermissao, type AppPermission } from "./permissions";

export const verificarSessao = cache(async () => usuarioServidorComCargo());

export const exigirPermissao = cache(async (permissao: AppPermission) => {
  const contexto = await verificarSessao();
  if (!contexto) redirect("/");
  if (!temPermissao(contexto.cargo, permissao)) redirect("/dashboard");
  return contexto;
});
