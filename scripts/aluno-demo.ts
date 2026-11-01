// Cria (ou apaga) contas fictícias para testar as telas no site.
// Uso: npx tsx --env-file=.env.local scripts/aluno-demo.ts criar      -> aluno demo; imprime link de acesso de uso único
//      npx tsx --env-file=.env.local scripts/aluno-demo.ts professor  -> professor demo; imprime link de acesso
//      npx tsx --env-file=.env.local scripts/aluno-demo.ts codigo     -> código de 6 dígitos para entrar como aluno demo no app instalado
//      npx tsx --env-file=.env.local scripts/aluno-demo.ts apagar     -> apaga os dois e tudo deles
// DEMO_SITE muda o endereço (padrão: o site publicado).

import { clienteAdmin } from "./comum.ts";

const EMAIL_ALUNO = "aluno.demo@exemplo.invalid";
const EMAIL_PROF = "professor.demo@exemplo.invalid";
const SITE = process.env.DEMO_SITE ?? "https://area-aluno-ca.vercel.app";
const admin = clienteAdmin();
const acao = process.argv[2];

async function usuarioPorEmail(email: string) {
  for (let pagina = 1; ; pagina++) {
    const { data } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (!data.users.length) return null;
    const u = data.users.find((x) => x.email === email);
    if (u) return u;
  }
}

async function link(email: string) {
  const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${SITE}/auth/link` } });
  return data.properties?.action_link;
}

async function apagar() {
  const { data: a } = await admin.from("alunos").select("id, user_id").eq("email", EMAIL_ALUNO).maybeSingle();
  if (a) {
    for (const bucket of ["fotos", "documentos"]) {
      for (const pasta of [a.id, `${a.id}/anamnese`]) {
        const { data: arquivos } = await admin.storage.from(bucket).list(pasta);
        const soArquivos = (arquivos ?? []).filter((f) => f.id);
        if (soArquivos.length) await admin.storage.from(bucket).remove(soArquivos.map((f) => `${pasta}/${f.name}`));
      }
    }
    await admin.from("alunos").delete().eq("id", a.id);
    await admin.from("registro_alteracoes").delete().eq("registro_id", a.id);
    await admin.from("registro_alteracoes").delete().eq("depois->>aluno_id", a.id);
    await admin.from("registro_alteracoes").delete().eq("antes->>aluno_id", a.id);
  }
  for (const email of [EMAIL_ALUNO, EMAIL_PROF]) {
    const u = await usuarioPorEmail(email);
    if (u) await admin.auth.admin.deleteUser(u.id);
  }
  console.log("Contas demo apagadas.");
}

if (acao === "apagar") {
  await apagar();
} else if (acao === "codigo") {
  // Código de 6 dígitos para entrar no app instalado (iPhone): digita o e-mail demo no app e depois este código
  const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email: EMAIL_ALUNO });
  console.log(`E-mail: ${EMAIL_ALUNO}\nCódigo: ${data.properties?.email_otp}`);
} else if (acao === "professor") {
  await admin.auth.admin.createUser({ email: EMAIL_PROF, email_confirm: true });
  const u = await usuarioPorEmail(EMAIL_PROF);
  await admin.from("perfis").upsert({ id: u!.id, papel: "professor" });
  console.log(await link(EMAIL_PROF));
} else {
  await apagar();
  const inicio = new Date(Date.now() - 44 * 86_400_000).toISOString().slice(0, 10); // semana 7
  const { data: a, error } = await admin
    .from("alunos")
    .insert({ nome: "Aluno Demonstração", email: EMAIL_ALUNO, app_treino: "mfit", tem_nutricao: true, objetivo: "Teste do sistema", fim: new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10) })
    .select("id")
    .single();
  if (error || !a) throw error;
  await admin.auth.admin.createUser({ email: EMAIL_ALUNO, email_confirm: true });
  await admin.from("ciclos").insert({ aluno_id: a.id, numero: 2, inicio, objetivo: "Ganhar força nos membros inferiores" });
  await admin.from("registros_evolucao").insert([
    { aluno_id: a.id, data: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10), peso: 74.2 },
    { aluno_id: a.id, data: new Date(Date.now() - 16 * 86_400_000).toISOString().slice(0, 10), peso: 73.1, medidas: { cintura: 82 } },
  ]);
  console.log(await link(EMAIL_ALUNO));
}
