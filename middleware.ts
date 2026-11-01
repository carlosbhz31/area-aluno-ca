import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./lib/env";

const ROTAS_PUBLICAS = ["/entrar", "/auth", "/cadastro", "/manifest.webmanifest", "/brand", "/icones", "/sw.js", "/api/cron"];

export async function middleware(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  // Renova a sessão se precisar e confere a assinatura do token (sem consulta extra ao Supabase)
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ?? null;

  const caminho = request.nextUrl.pathname;
  const publica = ROTAS_PUBLICAS.some((r) => caminho === r || caminho.startsWith(r + "/"));

  // Ação de formulário (salvar) com a sessão vencida: deixa passar; a própria ação manda para /entrar
  // do jeito que a tela entende. Redirecionar aqui quebrava a página ("Application error").
  const acaoDeFormulario = request.method === "POST" && request.headers.has("next-action");

  if (!user && !publica && !acaoDeFormulario) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
