import type { ReactNode } from "react";
import { exigirPermissao } from "@/lib/auth/dal";

export default async function AlunosLayout({ children }: { children: ReactNode }) {
  await exigirPermissao("alunos.visualizar");
  return children;
}
