import type { ReactNode } from "react";
import { exigirPermissao } from "@/lib/auth/dal";

export default async function TurmasLayout({ children }: { children: ReactNode }) {
  await exigirPermissao("academico.visualizar");
  return children;
}
