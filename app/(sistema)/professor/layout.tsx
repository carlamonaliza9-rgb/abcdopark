import { exigirPermissao } from "@/lib/auth/dal";

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  await exigirPermissao("academico.visualizar");
  return children;
}
