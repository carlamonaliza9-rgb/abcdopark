import type { ReactNode } from "react";
import { exigirPermissao } from "@/lib/auth/dal";

export default async function FuncionariosLayout({ children }: { children: ReactNode }) {
  await exigirPermissao("funcionarios.visualizar");
  return children;
}
