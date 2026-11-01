import { NextResponse, type NextRequest } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function POST(request: NextRequest) {
  const supabase = await clienteServidor();
  // "local": sai só deste aparelho. O padrão (global) derrubava a sessão do computador ao sair no celular.
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/entrar", request.nextUrl.origin), { status: 303 });
}
