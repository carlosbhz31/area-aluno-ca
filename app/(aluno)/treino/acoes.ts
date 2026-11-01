"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAluno } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/servidor";
import { situacaoDoCiclo } from "@/lib/ciclo";
import { numero, planoDoDia, type ExercicioFicha } from "@/lib/treino";
import type { Ciclo } from "@/lib/tipos";

async function meuAluno() {
  const s = await exigirAluno();
  const { data: aluno } = await s.supabase.from("alunos").select("id").eq("user_id", s.user.id).maybeSingle();
  if (!aluno) redirect("/inicio");
  return { ...s, alunoId: aluno.id as string };
}

/** Cancela as pausas que ainda não tocaram (nova série, pular, terminar o treino). */
async function cancelarPausas(userId: string) {
  await clienteAdmin().from("pausas").update({ cancelada_em: new Date().toISOString() }).eq("user_id", userId).is("enviada_em", null).is("cancelada_em", null);
}

/** Começa o treino (ou retoma, se já estava aberto). Um treino aberto de outro dia é encerrado. */
export async function iniciarTreino(treinoId: string) {
  const s = await meuAluno();
  const { data: aberta } = await s.supabase.from("execucoes").select("id, treino_id, series_feitas(count)").is("concluida_em", null).maybeSingle();
  if (aberta?.treino_id === treinoId) redirect(`/treino/sessao/${aberta.id}`);
  if (aberta) {
    const feitas = (aberta.series_feitas as unknown as { count: number }[])[0]?.count ?? 0;
    if (feitas) await s.supabase.from("execucoes").update({ concluida_em: new Date().toISOString() }).eq("id", aberta.id);
    else await s.supabase.from("execucoes").delete().eq("id", aberta.id);
  }

  const { data: treino } = await s.supabase
    .from("treinos")
    .select("id, nome, foco, programa_id, programas!inner(ativo, ciclo_id), exercicios_treino(*)")
    .eq("id", treinoId)
    .maybeSingle();
  if (!treino) redirect("/treino");

  const { data: ciclo } = await s.supabase.from("ciclos").select("*").eq("aluno_id", s.alunoId).eq("ativo", true).maybeSingle<Ciclo>();
  const sit = situacaoDoCiclo(ciclo);
  const semana = sit.tipo === "em_andamento" ? sit.semana : null;

  const { data: nova, error } = await s.supabase
    .from("execucoes")
    .insert({
      aluno_id: s.alunoId,
      treino_id: treino.id,
      programa_id: treino.programa_id,
      semana,
      nome_treino: treino.foco ? `${treino.nome} · ${treino.foco}` : treino.nome,
      plano: planoDoDia(treino.exercicios_treino as ExercicioFicha[], semana),
    })
    .select("id")
    .single();
  if (error || !nova) redirect("/treino?erro=1");
  redirect(`/treino/sessao/${nova.id}`);
}

export type SerieEnviada = {
  execucaoId: string;
  exercicioId: string;
  numero: number;
  aquecimento: boolean;
  carga: string | number | null;
  reps: string | number | null;
  segundos: string | number | null;
  pausa: number; // segundos de pausa depois desta série (0 = sem pausa)
  proximo: string; // texto do aviso: o que vem agora
};

/** Marca a série e agenda o aviso do fim da pausa no servidor. Devolve a hora do fim pelo relógio do servidor. */
export async function marcarSerie(x: SerieEnviada): Promise<{ erro?: string; terminaEm?: string; agora?: string }> {
  const s = await meuAluno();
  const { data: exec } = await s.supabase.from("execucoes").select("id, concluida_em").eq("id", x.execucaoId).maybeSingle();
  if (!exec || exec.concluida_em) return { erro: "Esse treino já foi encerrado." };

  const { error } = await s.supabase.from("series_feitas").upsert(
    {
      execucao_id: x.execucaoId,
      aluno_id: s.alunoId,
      exercicio_id: x.exercicioId,
      numero: Math.max(1, Math.min(20, Math.round(x.numero))),
      aquecimento: !!x.aquecimento,
      carga: numero(x.carga, 1000),
      reps: numero(x.reps, 500) == null ? null : Math.round(numero(x.reps, 500)!),
      segundos: numero(x.segundos, 3600) == null ? null : Math.round(numero(x.segundos, 3600)!),
      feita_em: new Date().toISOString(),
    },
    { onConflict: "execucao_id,exercicio_id,aquecimento,numero" },
  );
  if (error) return { erro: "Não consegui salvar a série. Confere a internet." };

  await cancelarPausas(s.user.id);
  const agora = new Date();
  const pausa = Math.max(0, Math.min(600, Math.round(x.pausa)));
  if (!pausa) return { agora: agora.toISOString() };

  const terminaEm = new Date(agora.getTime() + pausa * 1000);
  const { error: e2 } = await clienteAdmin().from("pausas").insert({
    user_id: s.user.id,
    execucao_id: x.execucaoId,
    termina_em: terminaEm.toISOString(),
    titulo: "Fim da pausa ⏱️",
    corpo: String(x.proximo || "Bora para a próxima série.").slice(0, 160),
    url: `/treino/sessao/${x.execucaoId}`,
  });
  if (e2) return { erro: "Série salva, mas não consegui agendar o aviso da pausa.", agora: agora.toISOString() };
  return { terminaEm: terminaEm.toISOString(), agora: agora.toISOString() };
}

export async function desmarcarSerie(execucaoId: string, exercicioId: string, numeroSerie: number, aquecimento: boolean) {
  const s = await meuAluno();
  await s.supabase.from("series_feitas").delete().match({ execucao_id: execucaoId, exercicio_id: exercicioId, numero: numeroSerie, aquecimento });
}

/** +15 s, -15 s ou pular: muda a pausa que está correndo. */
export async function ajustarPausa(segundos: number | "pular"): Promise<{ terminaEm?: string; agora?: string }> {
  const s = await meuAluno();
  const admin = clienteAdmin();
  const { data: p } = await admin
    .from("pausas")
    .select("id, termina_em")
    .eq("user_id", s.user.id)
    .is("enviada_em", null)
    .is("cancelada_em", null)
    .order("termina_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const agora = new Date();
  if (!p) return { agora: agora.toISOString() };
  if (segundos === "pular") {
    await cancelarPausas(s.user.id);
    return { agora: agora.toISOString() };
  }
  const novo = new Date(Math.max(agora.getTime() + 3000, Date.parse(p.termina_em) + segundos * 1000));
  await admin.from("pausas").update({ termina_em: novo.toISOString() }).eq("id", p.id).is("enviada_em", null);
  return { terminaEm: novo.toISOString(), agora: agora.toISOString() };
}

export async function concluirTreino(execucaoId: string, esforco: number | null, comentario: string) {
  const s = await meuAluno();
  await cancelarPausas(s.user.id);
  await s.supabase
    .from("execucoes")
    .update({
      concluida_em: new Date().toISOString(),
      esforco: esforco && esforco >= 1 && esforco <= 10 ? Math.round(esforco) : null,
      comentario: comentario.trim().slice(0, 1000) || null,
    })
    .eq("id", execucaoId)
    .is("concluida_em", null);
  revalidatePath("/treino");
  redirect(`/treino?concluido=${execucaoId}`);
}

export async function descartarTreino(execucaoId: string) {
  const s = await meuAluno();
  await cancelarPausas(s.user.id);
  await s.supabase.from("execucoes").delete().eq("id", execucaoId).is("concluida_em", null);
  revalidatePath("/treino");
  redirect("/treino");
}
