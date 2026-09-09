import { redirect } from "next/navigation";

// Mantém favoritos e atalhos antigos funcionando após a unificação financeira.
export default function ContasAPagarCompatibilidadePage() {
  redirect("/admin/financeiro/saidas");
}
