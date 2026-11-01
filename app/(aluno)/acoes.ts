"use server";

import { revalidatePath } from "next/cache";
import { exigirAluno } from "@/lib/sessao";
import { prazoDaSemana, type Respostas } from "@/lib/acompanhamento";
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

  const { error } = await ctx.supabase.from("acompanhamentos").insert({
    aluno_id: ctx.aluno.id,
    ciclo_id: prazo.tipo === "ativo" ? ctx.ciclo!.id : null,
    semana: prazo.tipo === "ativo" ? prazo.semana : null,
    respostas,
  });
  if (error) return { erro: error.code === "23505" ? "Você já mandou o acompanhamento desta semana." : "Não consegui enviar. Tenta de novo." };

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
  revalidatePath("/evolucao");
  return { ok: "Registrado!" };
}
