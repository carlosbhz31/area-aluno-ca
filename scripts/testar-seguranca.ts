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
const usuarioTeste = (await cliente.auth.getUser()).data.user?.id;

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

await admin.from("dados_privados").upsert({ aluno_id: aluno!.id, cidade: "Teste", uf: "MG" });
const { data: endereco } = await cliente.from("dados_privados").select("*");
confere("aluno não vê o próprio endereço/CPF", (endereco ?? []).length === 0);

// Etapa 2: acompanhamento, reavaliação e fotos
const { data: cicloTeste } = await admin.from("ciclos").select("id").eq("aluno_id", aluno!.id).single();
const { data: outroCiclo } = await admin.from("ciclos").select("id, aluno_id").neq("aluno_id", aluno!.id).limit(1).maybeSingle();

const { error: eEnvio } = await cliente.from("acompanhamentos").insert({ aluno_id: aluno!.id, ciclo_id: cicloTeste!.id, semana: 1, respostas: { treinos_feitos: 3 } });
confere("aluno envia o próprio acompanhamento", !eEnvio);
const { error: eDuplo } = await cliente.from("acompanhamentos").insert({ aluno_id: aluno!.id, ciclo_id: cicloTeste!.id, semana: 1, respostas: {} });
confere("aluno não manda dois na mesma semana", !!eDuplo);
const { error: eAutoResposta } = await cliente.from("acompanhamentos").insert({ aluno_id: aluno!.id, ciclo_id: cicloTeste!.id, semana: 2, respostas: {}, resposta_professor: "eu mesmo" });
confere("aluno não escreve a resposta do professor", !!eAutoResposta);
const { data: respondeu } = await cliente.from("acompanhamentos").update({ resposta_professor: "eu mesmo" }).eq("aluno_id", aluno!.id).select();
confere("aluno não edita acompanhamento enviado", !respondeu || respondeu.length === 0);
if (outroCiclo) {
  const { error: eCicloAlheio } = await cliente.from("acompanhamentos").insert({ aluno_id: aluno!.id, ciclo_id: outroCiclo.id, semana: 3, respostas: {} });
  confere("aluno não manda acompanhamento no ciclo de outro", !!eCicloAlheio);
  const { error: eReavAlheia } = await cliente.from("reavaliacoes").insert({ aluno_id: aluno!.id, ciclo_id: outroCiclo.id, formato: "call" });
  confere("aluno não escolhe reavaliação no ciclo de outro", !!eReavAlheia);
}
const { error: eReav } = await cliente.from("reavaliacoes").insert({ aluno_id: aluno!.id, ciclo_id: cicloTeste!.id, formato: "whatsapp" });
confere("aluno escolhe a própria reavaliação", !eReav);
const { data: reavsVistas } = await cliente.from("reavaliacoes").select("aluno_id");
confere("aluno só vê a própria reavaliação", (reavsVistas ?? []).every((r) => r.aluno_id === aluno!.id));

const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
const { error: eFoto } = await cliente.storage.from("fotos").upload(`${aluno!.id}/teste-${Date.now()}.png`, png, { contentType: "image/png" });
confere("aluno envia foto na própria pasta", !eFoto);
if (outroCiclo) {
  const { error: eFotoAlheia } = await cliente.storage.from("fotos").upload(`${outroCiclo.aluno_id}/invasao.png`, png, { contentType: "image/png" });
  confere("aluno não envia foto na pasta de outro", !!eFotoAlheia);
  const { data: listaAlheia } = await cliente.storage.from("fotos").list(outroCiclo.aluno_id);
  confere("aluno não lista fotos de outro", (listaAlheia ?? []).length === 0);
}
const { error: ePdf } = await cliente.storage.from("documentos").upload(`${aluno!.id}/plano.pdf`, new Blob(["%PDF"], { type: "application/pdf" }), { contentType: "application/pdf" });
confere("aluno não sobe PDF de plano alimentar", !!ePdf);

// Etapa 3: avisos e jogo
const { error: ePushAlheio } = await cliente.from("inscricoes_push").insert({ user_id: (await admin.from("perfis").select("id").eq("papel", "professor").limit(1).single()).data!.id, endpoint: "https://exemplo.invalid/x", p256dh: "x", auth: "x" });
confere("aluno não cadastra aviso no aparelho de outro", !!ePushAlheio);
const { data: pushVistos } = await cliente.from("inscricoes_push").select("user_id");
confere("aluno só vê as próprias inscrições de aviso", (pushVistos ?? []).length === 0);
const { error: eConquista } = await cliente.from("conquistas").insert({ aluno_id: aluno!.id, broche: "um_ano" });
confere("aluno não se dá broche", !!eConquista);
const { data: notiAlheias } = await cliente.from("notificacoes").select("destinatario");
confere("aluno só vê os próprios avisos", (notiAlheias ?? []).every((n) => n.destinatario === (usuarioTeste ?? "")));

// Etapa 4: termos e anamnese
const { count: termosAntes } = await admin.from("alunos").select("id", { count: "exact", head: true }).eq("termos_versao", "teste");
await cliente.rpc("aceitar_termos", { versao: "teste" });
const { count: termosDepois } = await admin.from("alunos").select("id", { count: "exact", head: true }).eq("termos_versao", "teste");
const { data: proprioTermo } = await admin.from("alunos").select("termos_versao").eq("id", aluno!.id).single();
confere("aceite dos termos vale só para o próprio aluno", proprioTermo?.termos_versao === "teste" && (termosDepois ?? 0) - (termosAntes ?? 0) === 1);
const { data: termoDireto } = await cliente.from("alunos").update({ termos_versao: "falso" }).eq("id", aluno!.id).select();
confere("aluno não edita o cadastro para mudar o aceite", (termoDireto ?? []).length === 0);
const { data: anam, error: eAnam } = await cliente.from("anamneses").insert({ aluno_id: aluno!.id, respostas: { rotina: { profissao: "teste" } } }).select("id").single();
confere("aluno abre a própria anamnese", !eAnam);
const { error: eDoisRascunhos } = await cliente.from("anamneses").insert({ aluno_id: aluno!.id, respostas: {} });
confere("só um rascunho de anamnese por vez", !!eDoisRascunhos);
const { data: autoRevisao } = await cliente.from("anamneses").update({ status: "revisada" }).eq("id", anam?.id ?? "").select();
confere("aluno não marca a própria anamnese como revisada", (autoRevisao ?? []).length === 0);
const { data: dataRevisao } = await cliente.from("anamneses").update({ revisada_em: new Date().toISOString() }).eq("id", anam?.id ?? "").select();
confere("aluno não preenche a data de revisão", (dataRevisao ?? []).length === 0);
const { error: eAnamAlheia } = await cliente.from("anamneses").insert({ aluno_id: outroCiclo?.aluno_id ?? aluno!.id, respostas: {}, tipo: "realinhamento" });
confere("aluno não cria anamnese para outro aluno", !!eAnamAlheia || !outroCiclo);
await admin.from("anamneses").update({ status: "revisada", revisada_em: new Date().toISOString() }).eq("id", anam?.id ?? "");
const { data: editaRevisada } = await cliente.from("anamneses").update({ respostas: {} }).eq("id", anam?.id ?? "").select();
confere("anamnese revisada fica travada para o aluno", (editaRevisada ?? []).length === 0);
const { error: eFotoAnam } = await cliente.storage.from("fotos").upload(`${aluno!.id}/anamnese/teste-${Date.now()}.jpg`, png, { contentType: "image/jpeg" });
confere("aluno envia foto da anamnese na própria pasta", !eFotoAnam);
const { data: anamAlheias } = await cliente.from("anamneses").select("aluno_id");
confere("aluno só vê as próprias anamneses", (anamAlheias ?? []).every((x) => x.aluno_id === aluno!.id));

const { data: listaNutriAluno } = await cliente.rpc("alunos_da_nutricao");
confere("aluno não vê a lista da nutrição", (listaNutriAluno ?? []).length === 0);

// Nutricionista fictícia
const emailNutri = `nutri-teste-${Date.now()}@exemplo.invalid`;
const { data: nutriUser } = await admin.auth.admin.createUser({ email: emailNutri, email_confirm: true });
await admin.from("perfis").upsert({ id: nutriUser.user!.id, papel: "nutricionista" });
const { data: linkNutri } = await admin.auth.admin.generateLink({ type: "magiclink", email: emailNutri });
const nutri = createClient(URL, ANON, { auth: { persistSession: false } });
await nutri.auth.verifyOtp({ token_hash: linkNutri.properties?.hashed_token ?? "", type: "email" });

await admin.from("alunos").update({ tem_nutricao: true }).eq("id", aluno!.id);
const { data: semNutri } = await admin.from("alunos").select("id").eq("tem_nutricao", false).neq("situacao", "inativo").limit(1).maybeSingle();

const { data: listaNutri } = await nutri.rpc("alunos_da_nutricao");
const { count: totalNutri } = await admin.from("alunos").select("id", { count: "exact", head: true }).eq("tem_nutricao", true).neq("situacao", "inativo");
confere("nutricionista vê só alunos com nutrição", (listaNutri ?? []).length === totalNutri && (listaNutri ?? []).every((x: { id: string }) => x.id));
confere("lista da nutrição traz só nome (sem e-mail, valor, telefone)", Object.keys((listaNutri ?? [])[0] ?? {}).every((k) => ["id", "nome", "nutricionista", "renovacao_plano_alimentar"].includes(k)));
for (const t of ["alunos", "acompanhamentos", "registros_evolucao", "anotacoes_internas", "dados_privados", "anamneses", "ciclos"]) {
  const { data: d } = await nutri.from(t).select("*").limit(3);
  confere(`nutricionista não lê ${t}`, (d ?? []).length === 0);
}
const pdf = new Blob(["%PDF-1.4"], { type: "application/pdf" });
const caminhoNutri = `${aluno!.id}/plano-teste-${Date.now()}.pdf`;
const { error: eUpNutri } = await nutri.storage.from("documentos").upload(caminhoNutri, pdf, { contentType: "application/pdf" });
confere("nutricionista envia PDF de aluno com nutrição", !eUpNutri);
const { error: eDocNutri } = await nutri.from("documentos").insert({ aluno_id: aluno!.id, tipo: "plano_alimentar", arquivo_path: caminhoNutri });
confere("nutricionista registra o plano alimentar", !eDocNutri);
const { error: eOutroTipo } = await nutri.from("documentos").insert({ aluno_id: aluno!.id, tipo: "outro", arquivo_path: caminhoNutri });
confere("nutricionista não publica outro tipo de documento", !!eOutroTipo);
if (semNutri) {
  const { error: eUpAlheio } = await nutri.storage.from("documentos").upload(`${semNutri.id}/x.pdf`, pdf, { contentType: "application/pdf" });
  confere("nutricionista não envia PDF de aluno sem nutrição", !!eUpAlheio);
  const { error: eDocAlheio } = await nutri.from("documentos").insert({ aluno_id: semNutri.id, tipo: "plano_alimentar", arquivo_path: `${semNutri.id}/x.pdf` });
  confere("nutricionista não registra plano de aluno sem nutrição", !!eDocAlheio);
}
const { error: eFotoNutri } = await nutri.storage.from("fotos").upload(`${aluno!.id}/x.jpg`, png, { contentType: "image/png" });
confere("nutricionista não mexe nas fotos", !!eFotoNutri);
const { data: listaFotos } = await nutri.storage.from("fotos").list(aluno!.id);
confere("nutricionista não vê as fotos", (listaFotos ?? []).length === 0);
const { data: docsAluno } = await cliente.from("documentos").select("id");
confere("aluno vê o plano que a nutricionista publicou", (docsAluno ?? []).length === 1);
await admin.storage.from("documentos").remove([caminhoNutri]);
await admin.auth.admin.deleteUser(nutriUser.user!.id);

// Inativo: some tudo para o aluno (o cadastro continua no banco)
await admin.from("alunos").update({ situacao: "inativo" }).eq("id", aluno!.id);
const { data: inativoVe } = await cliente.from("alunos").select("id");
const { data: inativoCiclo } = await cliente.from("ciclos").select("id");
confere("aluno inativo não vê mais nada", (inativoVe ?? []).length === 0 && (inativoCiclo ?? []).length === 0);
const { count: guardado } = await admin.from("ciclos").select("id", { count: "exact", head: true }).eq("aluno_id", aluno!.id);
confere("dados do inativo continuam guardados", guardado === 1);
await admin.from("alunos").update({ situacao: "ativo" }).eq("id", aluno!.id);
const { data: reativado } = await cliente.from("ciclos").select("id");
confere("ao reativar, o aluno volta a ver tudo", (reativado ?? []).length === 1);

// Limpeza
for (const pasta of [aluno!.id, `${aluno!.id}/anamnese`]) {
  const { data: arquivos } = await admin.storage.from("fotos").list(pasta);
  const soArquivos = (arquivos ?? []).filter((a) => a.id);
  if (soArquivos.length) await admin.storage.from("fotos").remove(soArquivos.map((a) => `${pasta}/${a.name}`));
}
const { data: usuario } = await cliente.auth.getUser();
await admin.from("alunos").delete().eq("id", aluno!.id);
if (usuario.user) await admin.auth.admin.deleteUser(usuario.user.id);
await admin.from("registro_alteracoes").delete().eq("registro_id", aluno!.id);

console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo: cada aluno só enxerga o que é dele.");
process.exit(falhas ? 1 : 0);
