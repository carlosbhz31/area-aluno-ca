import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../env";

// Fluxo "implicit": o link do e-mail funciona mesmo se abrir em outro navegador
// (ex.: pedido no Safari, aberto dentro do app do Gmail).
export function clienteNavegador() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: "implicit" },
  });
}
