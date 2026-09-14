import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function criarSupabaseServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function usuarioServidorComCargo() {
  const supabase = await criarSupabaseServidor();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfis")
    .select("cargo")
    .eq("id", user.id)
    .maybeSingle();

  return { user, cargo: perfil?.cargo || null };
}

export async function usuarioServidorEhEquipe() {
  const autenticacao = await usuarioServidorComCargo();
  if (!autenticacao) return false;
  return ["Admin", "Direção", "Professor"].includes(autenticacao.cargo || "");
}
