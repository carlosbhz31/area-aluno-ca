import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as criarClienteSupabase } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../env";

/** Cliente com a sessão do usuário: respeita as regras de segurança do banco. */
export async function clienteServidor() {
  const loja = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => loja.set(name, value, options));
        } catch {
          // Chamado de um Server Component: o middleware renova a sessão.
        }
      },
    },
  });
}

/** Cliente administrativo: ignora as regras do banco. Use só depois de checar que é o professor. */
export function clienteAdmin() {
  return criarClienteSupabase(SUPABASE_URL, (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/[﻿\s"']/g, ""), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
