import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Pega o endereço que a pessoa está tentando acessar
  const caminho = request.nextUrl.pathname;

  // 2. Definimos quais áreas são exclusivas para quem tem login
  const rotasProtegidas = ['/dashboard', '/admin', '/professor'];
  
  // Verifica se o caminho atual faz parte das áreas protegidas
  const tentandoAcessarAreaFechada = rotasProtegidas.some(rota => caminho.startsWith(rota));

  if (tentandoAcessarAreaFechada) {
    // 3. Procura no navegador se existe o Cookie (crachá) do Supabase
    // O Supabase sempre cria um cookie que termina com '-auth-token'
    const temCracha = request.cookies.getAll().some(cookie => cookie.name.includes('-auth-token'));

    // 4. Se a pessoa tentar entrar sem o crachá, é barrada e mandada para o Login (/)
    if (!temCracha) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Se a pessoa tem o crachá ou está acessando uma área livre (como o próprio login), deixa passar
  return NextResponse.next();
}

// Isso avisa ao Next.js para só acionar o segurança nessas pastas, deixando o sistema mais rápido
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/professor/:path*'
  ]
};