"use client";

import { SidebarPais } from "../_components/SidebarPais";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PortalAlunoLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams();
  const router = useRouter();
  const alunoId = Array.isArray(id) ? id[0] : (id ?? "");
  const [autorizado, setAutorizado] = useState(false);
  const [validando, setValidando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function validarResponsavel() {
      setValidando(true);

      const idNumerico = Number(alunoId);
      if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
        router.replace("/dashboard");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        router.replace("/");
        return;
      }

      const email = user.email.toLowerCase().trim();
      const { data: aluno, error } = await supabase
        .from("alunos")
        .select("email_responsavel, email_responsavel_2, email_responsavel_3")
        .eq("id", idNumerico)
        .maybeSingle();

      const emailsResponsaveis = [
        aluno?.email_responsavel,
        aluno?.email_responsavel_2,
        aluno?.email_responsavel_3,
      ]
        .filter(Boolean)
        .map((valor) => String(valor).toLowerCase().trim());

      if (error || !aluno || !emailsResponsaveis.includes(email)) {
        router.replace("/dashboard");
        return;
      }

      if (ativo) {
        setAutorizado(true);
        setValidando(false);
      }
    }

    validarResponsavel();
    return () => { ativo = false; };
  }, [alunoId, router]);

  if (validando || !autorizado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Validando acesso ao estudante...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc]">
      <SidebarPais alunoId={alunoId} />

      <main className="flex-1 overflow-y-auto">
        <div className="w-full p-4 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
