"use server";

// Modo personal: o professor registra o treino do aluno presencial durante a aula, no celular dele.
// Fica tudo no histórico do aluno, igual a quando ele treina sozinho pelo app (as cargas valem para os
// dois). Sem aviso de pausa no celular (o professor está junto) e sem aviso de "treino concluído".

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirProfessor } from "@/lib/sessao";
import { situacaoDoCiclo } from "@/lib/ciclo";
import { numero, planoDoDia, unidadeValida, type ExercicioFicha } from "@/lib/treino";
import type { Ciclo } from "@/lib/tipos";
import type { SerieEnviada } from "@/app/(aluno)/treino/acoes";

const base = (alunoId: string) => `/professor/alunos/${alunoId}/personal`;

/** Execução aberta que é deste aluno (o professor só mexe no treino do aluno que abriu). */
async function execucaoDoAluno(alunoId: string, execucaoId: string) {
  const { supabase } = await exigirProfessor();
  const { data } = await supabase.from("execucoes").select("id, concluida_em").eq("id", execucaoId).eq("aluno_id", alunoId).maybeSingle();
  return { supabase, exec: data };
}

export async function iniciarTreinoPersonal(alunoId: string, treinoId: string) {
  const { supabase } = await exigirProfessor();
  const { data: aberta } = await supabase.from("execucoes").select("id, treino_id, series_feitas(count)").eq("aluno_id", alunoId).is("concluida_em", null).maybeSingle();
  if (aberta?.treino_id === treinoId) redirect(`${base(alunoId)}/${aberta.id}`);
  if (aberta) {
    const feitas = (aberta.series_feitas as unknown as { count: number }[])[0]?.count ?? 0;
    if (feitas) await supabase.from("execucoes").update({ concluida_em: new Date().toISOString() }).eq("id", aberta.id);
    else await supabase.from("execucoes").delete().eq("id", aberta.id);
  }
  const { data: treino } = await supabase.from("treinos").select("id, nome, foco, programa_id, exercicios_treino(*)").eq("id", treinoId).eq("aluno_id", alunoId).maybeSingle();
  if (!treino) redirect(base(alunoId));
  const { data: ciclo } = await supabase.from("ciclos").select("*").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle<Ciclo>();
  const sit = situacaoDoCiclo(ciclo);
  const semana = sit.tipo === "em_andamento" ? sit.semana : sit.tipo === "nao_iniciado" ? 1 : null;
  const { data: nova, error } = await supabase
    .from("execucoes")
    .insert({
      aluno_id: alunoId,
      treino_id: treino.id,
      programa_id: treino.programa_id,
      semana,
      nome_treino: treino.foco ? `${treino.nome} · ${treino.foco}` : treino.nome,
      plano: planoDoDia(treino.exercicios_treino as ExercicioFicha[], semana),
    })
    .select("id")
    .single();
  if (error || !nova) redirect(`${base(alunoId)}?erro=1`);
  redirect(`${base(alunoId)}/${nova.id}`);
}

export async function marcarSeriePersonal(alunoId: string, x: SerieEnviada): Promise<{ erro?: string; terminaEm?: string; agora?: string }> {
  const { supabase, exec } = await execucaoDoAluno(alunoId, x.execucaoId);
  if (!exec || exec.concluida_em) return { erro: "Esse treino já foi encerrado." };
  const { error } = await supabase.from("series_feitas").upsert(
    {
      execucao_id: x.execucaoId,
      aluno_id: alunoId,
      exercicio_id: x.exercicioId,
      numero: Math.max(1, Math.min(20, Math.round(x.numero))),
      aquecimento: !!x.aquecimento,
      carga: numero(x.carga, 1000),
      unidade: unidadeValida(x.unidade),
      reps: numero(x.reps, 500) == null ? null : Math.round(numero(x.reps, 500)!),
      segundos: numero(x.segundos, 3600) == null ? null : Math.round(numero(x.segundos, 3600)!),
      feita_em: new Date().toISOString(),
    },
    { onConflict: "execucao_id,exercicio_id,aquecimento,numero" },
  );
  if (error) return { erro: "Não consegui salvar a série. Confere a internet." };
  return { agora: new Date().toISOString() };
}

export async function desmarcarSeriePersonal(alunoId: string, execucaoId: string, exercicioId: string, numeroSerie: number, aquecimento: boolean) {
  const { supabase, exec } = await execucaoDoAluno(alunoId, execucaoId);
  if (!exec) return;
  await supabase.from("series_feitas").delete().match({ execucao_id: execucaoId, exercicio_id: exercicioId, numero: numeroSerie, aquecimento });
}

/** Pausa no modo personal é só na tela (o professor está junto): nada para ajustar no servidor. */
export async function ajustarPausaPersonal(): Promise<{ terminaEm?: string; agora?: string }> {
  return { agora: new Date().toISOString() };
}

export async function concluirTreinoPersonal(alunoId: string, execucaoId: string, esforco: number | null, comentario: string) {
  const { supabase, exec } = await execucaoDoAluno(alunoId, execucaoId);
  if (exec && !exec.concluida_em) {
    await supabase
      .from("execucoes")
      .update({
        concluida_em: new Date().toISOString(),
        esforco: esforco && esforco >= 1 && esforco <= 10 ? Math.round(esforco) : null,
        comentario: comentario.trim().slice(0, 1000) || null,
      })
      .eq("id", execucaoId);
  }
  revalidatePath(`/professor/alunos/${alunoId}/treino`);
  revalidatePath("/professor/hoje");
  redirect(`${base(alunoId)}?concluido=${execucaoId}`);
}

export async function descartarTreinoPersonal(alunoId: string, execucaoId: string) {
  const { supabase } = await exigirProfessor();
  await supabase.from("execucoes").delete().eq("id", execucaoId).eq("aluno_id", alunoId).is("concluida_em", null);
  redirect(base(alunoId));
}
