// Utilitários dos scripts. Regra: nunca imprimir nome, e-mail ou dado de saúde de aluno.

import { createClient } from "@supabase/supabase-js";

export function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
    process.exit(1);
  }
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function semAcento(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Converte datas comuns (AAAA-MM-DD, DD/MM/AAAA, ISO) para AAAA-MM-DD. */
export function data(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

export function argumento(nome: string): string | undefined {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export const aplicar = process.argv.includes("--aplicar");

export function cabecalho(titulo: string) {
  console.log(`\n${titulo}`);
  console.log(aplicar ? "Modo: APLICAR (grava no banco)" : "Modo: SIMULAÇÃO (nada é gravado; use --aplicar para gravar)");
  console.log("-".repeat(60));
}

/** Cria o usuário de login (sem senha). Ignora se já existir. */
export async function garantirLogin(admin: ReturnType<typeof clienteAdmin>, email: string) {
  const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error && !/already|registered|exists/i.test(error.message)) throw new Error(`login: ${error.message}`);
}
