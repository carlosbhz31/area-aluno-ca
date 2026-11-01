"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAluno } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/servidor";
import { prazoDaSemana, type Respostas } from "@/lib/acompanhamento";
import { ETAPAS, etapaPendente, limparEtapa, type RespostasAnamnese } from "@/lib/anamnese";
import { VERSAO_TERMOS } from "@/lib/termos";
import { hojeEmBH, situacaoDoCiclo } from "@/lib/ciclo";
import { conquistar, premiarAcompanhamento, premiarAnamnese, premiarEvolucao } from "@/lib/gamificacao";
import type { Ciclo } from "@/lib/tipos";

export type Resultado = { erro?: string; ok?: string } | undefined;

const texto = (f: FormData, k: string, max = 2000) => {
  const v = String(f.get(k) ?? "").trim().slice(0, max);
  return v === "" ? null : v;
};
const inteiro = (f: FormData, k: string, min: number, max: number) => {
  const v = texto(f, k);
  if (v == null) return null;
  const n = Math.round(Number(v.replace(",", ".")));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};
const decimal = (f: FormData, k: string, min: number, max: number) => {
  const v = texto(f, k);
  if (v == null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null;
};

/** O próprio aluno (pelas regras do banco, só enxerga o dele) e o ciclo ativo. */
async function meuContexto() {
  const s = await exigirAluno();
  const { data: aluno } = await s.supabase.from("alunos").select("id, dia_acompanhamento").eq("user_id", s.user.id).maybeSingle();
  if (!aluno) return null;
  const { data: ciclo } = await s.supabase.from("ciclos").select("*").eq("aluno_id", aluno.id).eq("ativo", true).maybeSingle<Ciclo>();
  return { ...s, aluno, ciclo };
}

export async function enviarAcompanhamento(_: Resultado, f: FormData): Promise<Resultado> {
  const ctx = await meuContexto();
  if (!ctx) return { erro: "Não achei seu cadastro ativo." };

  const { data: cfg } = await ctx.supabase.from("configuracoes").select("valor").eq("chave", "dia_padrao_acompanhamento").maybeSingle();
  const prazo = prazoDaSemana(ctx.ciclo, ctx.aluno.dia_acompanhamento ?? Number(cfg?.valor ?? 1));

  const respostas: Respostas = {
    treinos_planejados: inteiro(f, "treinos_planejados", 0, 14),
    treinos_feitos: inteiro(f, "treinos_feitos", 0, 14),
    aderencia: inteiro(f, "aderencia", 1, 5),
    cardio_vezes: inteiro(f, "cardio_vezes", 0, 14),
    dor: f.get("dor") === "sim",
    dor_onde: f.get("dor") === "sim" ? texto(f, "dor_onde", 300) : null,
    sono: inteiro(f, "sono", 1, 5),
    energia: inteiro(f, "energia", 1, 5),
    recorde: texto(f, "recorde", 300),
    duvidas: texto(f, "duvidas"),
  };
  if (respostas.treinos_feitos == null || respostas.aderencia == null || respostas.sono == null || respostas.energia == null) {
    return { erro: "Faltou responder treinos, aderência, sono ou energia." };
  }

  const { data: enviado, error } = await ctx.supabase
    .from("acompanhamentos")
    .insert({
      aluno_id: ctx.aluno.id,
      ciclo_id: prazo.tipo === "ativo" ? ctx.ciclo!.id : null,
      semana: prazo.tipo === "ativo" ? prazo.semana : null,
      respostas,
    })
    .select("id, ciclo_id, semana")
    .single();
  if (error) return { erro: error.code === "23505" ? "Você já mandou o acompanhamento desta semana." : "Não consegui enviar. Tenta de novo." };

  try {
    await premiarAcompanhamento(
      ctx.aluno.id,
      { ...enviado, respostas },
      prazo.tipo === "ativo" ? { diasAtraso: prazo.diasAtraso, semanasDoCiclo: ctx.ciclo!.semanas } : null,
    );
  } catch (e) {
    console.error("pontos do acompanhamento:", (e as Error).message); // o envio vale mesmo se a pontuação falhar
  }

  revalidatePath("/acompanhamento");
  revalidatePath("/inicio");
  return { ok: "Recebido! Te respondo em breve." };
}

export async function escolherReavaliacao(formato: "call" | "whatsapp") {
  const ctx = await meuContexto();
  if (!ctx?.ciclo) return;
  await ctx.supabase.from("reavaliacoes").upsert(
    { aluno_id: ctx.aluno.id, ciclo_id: ctx.ciclo.id, formato, escolhido_em: new Date().toISOString() },
    { onConflict: "ciclo_id" },
  );
  revalidatePath("/inicio");
}

/** O app aberto pela tela inicial do celular (modo instalado) vale o broche "Atalho no celular". */
export async function marcarAppInstalado() {
  const ctx = await meuContexto();
  if (ctx) await conquistar(ctx.aluno.id, "app_instalado");
}

/** O aluno confirma que instalou o app de treino (MFit ou treino.io). */
export async function marcarAppTreino() {
  const ctx = await meuContexto();
  if (ctx) await conquistar(ctx.aluno.id, "app_treino");
  revalidatePath("/inicio");
}

// Termos ---------------------------------------------------------------------

export async function aceitarTermos() {
  const s = await exigirAluno();
  const { data: aluno } = await s.supabase.from("alunos").select("id").eq("user_id", s.user.id).maybeSingle();
  if (!aluno) return;
  await s.supabase.rpc("aceitar_termos", { versao: VERSAO_TERMOS });
  await conquistar(aluno.id, "termos_aceitos");
  redirect("/inicio");
}

// Anamnese -------------------------------------------------------------------

/** Salva uma etapa. Sem id, abre o rascunho (inicial na primeira vez, realinhamento depois). */
export async function salvarEtapaAnamnese(anamneseId: string | null, etapaId: string, bruto: Record<string, unknown>): Promise<{ erro?: string; id?: string }> {
  const ctx = await meuContexto();
  if (!ctx) return { erro: "Não achei seu cadastro ativo." };
  const etapa = ETAPAS.find((e) => e.id === etapaId);
  if (!etapa) return { erro: "Etapa inválida." };
  const respostasEtapa = limparEtapa(etapa, bruto, ctx.aluno.id);

  if (!anamneseId) {
    const { count } = await ctx.supabase.from("anamneses").select("id", { count: "exact", head: true }).eq("aluno_id", ctx.aluno.id).neq("status", "rascunho");
    const tipo = count ? "realinhamento" : "inicial";
    if (tipo === "realinhamento" && etapa.soInicial) return { erro: "Etapa inválida." };
    const { data, error } = await ctx.supabase
      .from("anamneses")
      .insert({ aluno_id: ctx.aluno.id, tipo, respostas: { [etapa.id]: respostasEtapa } })
      .select("id")
      .single();
    if (error) return { erro: error.code === "23505" ? "Você já tem uma anamnese aberta. Recarrega a página." : "Não consegui salvar. Tenta de novo." };
    return { id: data.id };
  }

  const { data: atual } = await ctx.supabase.from("anamneses").select("id, respostas, status").eq("id", anamneseId).maybeSingle();
  if (!atual || atual.status === "revisada") return { erro: "Essa anamnese já foi revisada pelo Carlos." };
  const { error } = await ctx.supabase
    .from("anamneses")
    .update({ respostas: { ...(atual.respostas as RespostasAnamnese), [etapa.id]: respostasEtapa } })
    .eq("id", anamneseId);
  return error ? { erro: "Não consegui salvar. Tenta de novo." } : { id: anamneseId };
}

export async function concluirAnamnese(anamneseId: string): Promise<{ erro?: string }> {
  const ctx = await meuContexto();
  if (!ctx) return { erro: "Não achei seu cadastro ativo." };
  const { data: a } = await ctx.supabase.from("anamneses").select("id, tipo, respostas, status").eq("id", anamneseId).maybeSingle();
  if (!a || a.status === "revisada") return { erro: "Não achei essa anamnese." };
  const respostas = a.respostas as RespostasAnamnese;
  if (etapaPendente(a.tipo, respostas) >= 0) return { erro: "Ainda falta responder algumas perguntas." };

  if (a.status === "rascunho") {
    const { error } = await ctx.supabase.from("anamneses").update({ status: "concluida", concluida_em: new Date().toISOString() }).eq("id", a.id);
    if (error) return { erro: "Não consegui enviar. Tenta de novo." };
  }

  try {
    // Endereço da nota fiscal vai para a parte que só o Carlos vê (sem apagar o que ele já tinha)
    const dados = respostas.dados;
    if (dados?.endereco) {
      const admin = clienteAdmin();
      const { data: priv } = await admin.from("dados_privados").select("logradouro, cep").eq("aluno_id", ctx.aluno.id).maybeSingle();
      if (!priv?.logradouro && !priv?.cep) {
        await admin.from("dados_privados").upsert({ aluno_id: ctx.aluno.id, logradouro: String(dados.endereco), cep: String(dados.cep ?? "") || null }, { onConflict: "aluno_id" });
      }
      if (dados.nascimento) await admin.from("alunos").update({ nascimento: String(dados.nascimento) }).eq("id", ctx.aluno.id).is("nascimento", null);
    }
    await premiarAnamnese(ctx.aluno.id, a.id);
  } catch (e) {
    console.error("pós-anamnese:", (e as Error).message);
  }
  revalidatePath("/anamnese");
  revalidatePath("/inicio");
  return {};
}

/** Notificações no celular: guarda a inscrição deste aparelho. */
export async function salvarInscricaoPush(inscricao: { endpoint: string; keys: { p256dh: string; auth: string } }, aparelho: string) {
  const s = await exigirAluno();
  if (!inscricao?.endpoint?.startsWith("https://")) return { erro: "Inscrição inválida." };
  await s.supabase.from("inscricoes_push").delete().eq("endpoint", inscricao.endpoint);
  const { error } = await s.supabase.from("inscricoes_push").insert({
    user_id: s.user.id, endpoint: inscricao.endpoint, p256dh: inscricao.keys.p256dh, auth: inscricao.keys.auth, aparelho: aparelho.slice(0, 120),
  });
  if (error) return { erro: "Não consegui ativar." };
  const { data: aluno } = await s.supabase.from("alunos").select("id").eq("user_id", s.user.id).maybeSingle();
  if (aluno) await conquistar(aluno.id, "avisos_ligados");
  revalidatePath("/inicio");
  return { ok: "Notificações ativadas." };
}

export async function salvarSilencio(inicio: number, fim: number) {
  const s = await exigirAluno();
  await s.supabase.rpc("mudar_silencio", { hora_inicio: inicio, hora_fim: fim });
  revalidatePath("/mais");
}

/** As fotos já foram enviadas pelo navegador direto para a pasta privada do aluno; aqui só registra. */
export async function registrarEvolucao(_: Resultado, f: FormData): Promise<Resultado> {
  const ctx = await meuContexto();
  if (!ctx) return { erro: "Não achei seu cadastro ativo." };

  const foto = (k: string) => {
    const p = texto(f, k, 300);
    return p && p.startsWith(`${ctx.aluno.id}/`) && !p.includes("..") ? p : null;
  };
  const medidas = Object.fromEntries(
    ["cintura", "abdomen", "quadril", "braco", "coxa"]
      .map((m) => [m, decimal(f, m, 10, 300)])
      .filter(([, v]) => v != null),
  );
  const registro = {
    aluno_id: ctx.aluno.id,
    data: texto(f, "data", 10) ?? undefined,
    peso: decimal(f, "peso", 20, 400),
    medidas: Object.keys(medidas).length ? medidas : null,
    foto_frente_path: foto("foto_frente"),
    foto_lado_path: foto("foto_lado"),
    foto_costas_path: foto("foto_costas"),
  };
  if (!registro.peso && !registro.medidas && !registro.foto_frente_path && !registro.foto_lado_path && !registro.foto_costas_path) {
    return { erro: "Coloca pelo menos o peso, uma medida ou uma foto." };
  }

  const { error } = await ctx.supabase.from("registros_evolucao").insert(registro);
  if (error) return { erro: "Não consegui salvar. Tenta de novo." };

  try {
    const s = situacaoDoCiclo(ctx.ciclo);
    const fimDeCiclo = (s.tipo === "em_andamento" && s.semana >= s.total - 1) || s.tipo === "encerrado";
    await premiarEvolucao(
      ctx.aluno.id,
      {
        data: registro.data ?? hojeEmBH(),
        peso: registro.peso,
        medidas: registro.medidas,
        temFotos: !!(registro.foto_frente_path || registro.foto_lado_path || registro.foto_costas_path),
      },
      ctx.ciclo ? { id: ctx.ciclo.id, fimDeCiclo } : null,
    );
  } catch (e) {
    console.error("pontos da evolução:", (e as Error).message);
  }
  revalidatePath("/evolucao");
  return { ok: "Registrado!" };
}
