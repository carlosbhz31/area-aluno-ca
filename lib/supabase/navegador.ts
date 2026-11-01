import { createBrowserClient } from "@supabase/ssr";

// Fluxo "implicit": o link do e-mail funciona mesmo se abrir em outro navegador
// (ex.: pedido no Safari, aberto dentro do app do Gmail).
export function clienteNavegador() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit" },
  });
}
