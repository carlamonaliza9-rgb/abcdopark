import type { ReactNode } from "react";
import { exigirPermissao } from "@/lib/auth/dal";

export default async function DocumentacoesLayout({ children }: { children: ReactNode }) {
  await exigirPermissao("documentos.visualizar");
  return children;
}
