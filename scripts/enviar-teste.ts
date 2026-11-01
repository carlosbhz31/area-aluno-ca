// Envia um e-mail de login de teste (pelo mesmo caminho da tela de entrar).
// Uso: npx tsx --env-file=.env.local scripts/enviar-teste.ts seu@email.com

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../lib/env.ts";

const email = process.argv[2];
if (!email) {
  console.error("Uso: npx tsx --env-file=.env.local scripts/enviar-teste.ts seu@email.com");
  process.exit(1);
}
const cliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { error } = await cliente.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
console.log(error ? `erro: ${error.status} ${error.message}` : "enviado");
