// Teste das regras de segurança com um aluno fictício (criado e apagado no fim).
// Uso: npx tsx --env-file=.env.local scripts/testar-seguranca.ts
// Só imprime contagens e resultados, nunca dados de alunos.

import { createClient } from "@supabase/supabase-js";
import { clienteAdmin } from "./comum.ts";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = clienteAdmin();
const email = `teste-seguranca-${Date.now()}@exemplo.invalid`;
let falhas = 0;
const confere = (nome: string, ok: boolean) => {
  console.log(`${ok ? "OK   " : "FALHA"} ${nome}`);
  if (!ok) falhas++;
};

const TABELAS = ["alunos", "ciclos", "anotacoes_internas", "registros_evolucao", "pontuacoes", "conquistas", "registro_alteracoes", "perfis"];

// 1) Visitante sem login
const anon = createClient(URL, ANON, { auth: { persistSession: false } });
for (const t of TABELAS) {
  const { data } = await anon.from(t).select("*").limit(5);
  confere(`sem login não lê ${t}`, !data || data.length === 0);
}

// 2) Aluno fictício
const { count: totalAlunos } = await admin.from("alunos").select("id", { count: "exact", head: true });
const { data: aluno } = await admin.from("alunos").insert({ nome: "Teste Segurança", email }).select("id").single();
await admin.auth.admin.createUser({ email, email_confirm: true });
if (!aluno) throw new Error("não consegui criar o aluno de teste");
await admin.from("ciclos").insert({ aluno_id: aluno.id, inicio: "2026-10-01" });

const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
const cliente = createClient(URL, ANON, { auth: { persistSession: false } });
const { error: eLogin } = await cliente.auth.verifyOtp({ token_hash: link.properties?.hashed_token ?? "", type: "email" });
confere("aluno fictício consegue entrar", !eLogin);

const { data: vistos } = await cliente.from("alunos").select("id");
confere(`aluno vê só 1 cadastro (de ${totalAlunos! + 1})`, vistos?.length === 1 && vistos[0].id === aluno!.id);
const { data: ciclos } = await cliente.from("ciclos").select("aluno_id");
confere("aluno vê só o próprio ciclo", (ciclos ?? []).every((c) => c.aluno_id === aluno!.id) && (ciclos ?? []).length === 1);
const { data: notas } = await cliente.from("anotacoes_internas").select("id");
confere("aluno não vê anotações internas", (notas ?? []).length === 0);
const { data: hist } = await cliente.from("registro_alteracoes").select("id").limit(1);
confere("aluno não vê o registro de alterações", (hist ?? []).length === 0);

const { error: ePontos } = await cliente.from("pontuacoes").insert({ aluno_id: aluno!.id, acao: "trapaça", pontos: 1000 });
confere("aluno não consegue se dar pontos", !!ePontos);
const { data: virouProf } = await cliente.from("perfis").update({ papel: "professor" }).eq("id", (await cliente.auth.getUser()).data.user!.id).select();
confere("aluno não consegue virar professor", !virouProf || virouProf.length === 0);
const { data: editou } = await cliente.from("alunos").update({ plano: "light" }).eq("id", aluno!.id).select();
confere("aluno não edita o próprio cadastro", !editou || editou.length === 0);
const { error: ePeso } = await cliente.from("registros_evolucao").insert({ aluno_id: aluno!.id, peso: 70 });
confere("aluno registra o próprio peso", !ePeso);

// Limpeza
const { data: usuario } = await cliente.auth.getUser();
await admin.from("alunos").delete().eq("id", aluno!.id);
if (usuario.user) await admin.auth.admin.deleteUser(usuario.user.id);
await admin.from("registro_alteracoes").delete().eq("registro_id", aluno!.id);

console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo: cada aluno só enxerga o que é dele.");
process.exit(falhas ? 1 : 0);
