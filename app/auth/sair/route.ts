import { NextResponse, type NextRequest } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function POST(request: NextRequest) {
  const supabase = await clienteServidor();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/entrar", request.nextUrl.origin), { status: 303 });
}
