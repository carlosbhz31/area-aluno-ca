import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { clienteServidor } from "@/lib/supabase/servidor";

// Destino do link mágico. Usa token_hash (funciona mesmo se o link abrir em outro navegador)
// e aceita também o fluxo com "code".
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = (url.searchParams.get("type") ?? "email") as EmailOtpType;
  const code = url.searchParams.get("code");
  const supabase = await clienteServidor();

  let ok = false;
  if (tokenHash) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  return NextResponse.redirect(new URL(ok ? "/" : "/entrar?erro=link", url.origin));
}
