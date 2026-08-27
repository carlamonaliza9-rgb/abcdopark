import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const rotasProtegidas = ["/dashboard", "/admin", "/professor", "/portal-pais"];

export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const caminho = request.nextUrl.pathname;
  const exigeLogin = rotasProtegidas.some((rota) => caminho.startsWith(rota));

  if (exigeLogin) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const destino = request.nextUrl.clone();
      destino.pathname = "/";
      destino.search = "";
      return NextResponse.redirect(destino);
    }
  }

  resposta.headers.set("X-Frame-Options", "DENY");
  resposta.headers.set("X-Content-Type-Options", "nosniff");
  resposta.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  resposta.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return resposta;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/professor/:path*",
    "/portal-pais/:path*",
  ],
};
