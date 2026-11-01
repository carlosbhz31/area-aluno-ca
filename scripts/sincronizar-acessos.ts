// Aplica a regra de acesso a todos: aluno inativo tem o login bloqueado; ativo ou pausado, liberado.
// Uso: npx tsx --env-file=.env.local scripts/sincronizar-acessos.ts [--aplicar]
// Útil depois de importações que mudam a situação direto no banco.

import { aplicar, cabecalho, clienteAdmin } from "./comum.ts";

cabecalho("Sincronizar acessos");
const admin = clienteAdmin();
const { data: alunos } = await admin.from("alunos").select("id, user_id, situacao").not("user_id", "is", null);
const { data: profs } = await admin.from("perfis").select("id").eq("papel", "professor");
const professores = new Set((profs ?? []).map((p) => p.id));

let bloqueados = 0, liberados = 0;
for (const a of alunos ?? []) {
  if (professores.has(a.user_id)) continue;
  const inativo = a.situacao === "inativo";
  inativo ? bloqueados++ : liberados++;
  if (aplicar) await admin.auth.admin.updateUserById(a.user_id, { ban_duration: inativo ? "876000h" : "none" });
}
console.log(`Login bloqueado: ${bloqueados} | liberado: ${liberados}`);
