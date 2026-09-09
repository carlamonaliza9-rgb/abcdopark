import { exigirPermissao } from "@/lib/auth/dal";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigirPermissao("painel.admin");
  return children;
}
