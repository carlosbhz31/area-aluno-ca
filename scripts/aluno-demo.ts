// Cria (ou apaga) um aluno fictício para testar a tela do aluno no site publicado.
// Uso: npx tsx --env-file=.env.local scripts/aluno-demo.ts criar   -> imprime um link de acesso de uso único
//      npx tsx --env-file=.env.local scripts/aluno-demo.ts apagar

import { clienteAdmin } from "./comum.ts";

const EMAIL = "aluno.demo@exemplo.invalid";
const SITE = process.env.DEMO_SITE ?? "https://area-aluno-ca.vercel.app";
const admin = clienteAdmin();
const acao = process.argv[2];

async function apagar() {
  const { data: a } = await admin.from("alunos").select("id, user_id").eq("email", EMAIL).maybeSingle();
  if (a) {
    await admin.from("alunos").delete().eq("id", a.id);
    await admin.from("registro_alteracoes").delete().eq("registro_id", a.id);
    if (a.user_id) await admin.auth.admin.deleteUser(a.user_id);
  }
  console.log("Aluno demo apagado.");
}

if (acao === "apagar") {
  await apagar();
} else {
  await apagar();
  const hoje = new Date();
  const inicio = new Date(hoje.getTime() - 44 * 86_400_000).toISOString().slice(0, 10); // semana 7
  const { data: a, error } = await admin
    .from("alunos")
    .insert({ nome: "Aluno Demonstração", email: EMAIL, app_treino: "mfit", dia_acompanhamento: 1, objetivo: "Teste do sistema" })
    .select("id")
    .single();
  if (error || !a) throw error;
  await admin.auth.admin.createUser({ email: EMAIL, email_confirm: true });
  await admin.from("ciclos").insert({ aluno_id: a.id, numero: 2, inicio, objetivo: "Ganhar força nos membros inferiores" });
  await admin.from("pontuacoes").insert([{ aluno_id: a.id, acao: "teste", pontos: 42 }]);
  await admin.from("conquistas").insert({ aluno_id: a.id, broche: "primeiro_checkin" });
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: EMAIL, options: { redirectTo: `${SITE}/auth/link` } });
  console.log(link.properties?.action_link);
}
