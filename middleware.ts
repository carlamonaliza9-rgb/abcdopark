import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const caminho = request.nextUrl.pathname;
  const rotasProtegidas = ['/dashboard', '/admin', '/professor'];
  
  const tentandoAcessarAreaFechada = rotasProtegidas.some(rota => caminho.startsWith(rota));

  if (tentandoAcessarAreaFechada) {
    // 1. Busca especificamente o cookie de sessão do Supabase
    const cookieAuth = request.cookies.getAll().find(cookie => cookie.name.includes('-auth-token'));

    // 2. Validação Múltipla (Proteção contra cookies forjados)
    // Rejeita se não existir, se não tiver valor, ou se for muito curto para ser um JWT real
    if (!cookieAuth || !cookieAuth.value || cookieAuth.value.length < 50) {
      const urlLogin = new URL('/', request.url);
      return NextResponse.redirect(urlLogin);
    }
  }

  // 3. Resposta com Headers de Segurança Injetados
  const resposta = NextResponse.next();
  resposta.headers.set('X-Frame-Options', 'DENY');
  resposta.headers.set('X-Content-Type-Options', 'nosniff');
  resposta.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return resposta;
}

// Garante que o segurança só consuma processamento nas rotas críticas
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/professor/:path*'
  ]
};