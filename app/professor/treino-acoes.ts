"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { exigirProfessor } from "@/lib/sessao";
import { grupoPadrao, type Cardio, type Metrica, type SemanaPrescrita } from "@/lib/treino";

export type ExercicioLista = {
  id: string;
  nome: string;
  grupo: string | null;
  equipamento: string | null;
  video_url: string | null;
  metrica: Metrica;
  observacoes: string | null;
};

/** Exercício como o editor do professor trabalha (id vazio = novo). */
export type ExercicioEditor = {
  id: string;
  exercicio_id: string | null;
  nome: string;
  grupo: string | null;
  equipamento: string | null;
  video_url: string | null;
  metrica: Metrica;
  aquecimento: number;
  observacoes: string | null;
  superset: boolean;
  prescricao: SemanaPrescrita[];
};
export type TreinoEditor = { id: string; nome: string; foco: string | null; observacoes: string | null; exercicios: ExercicioEditor[] };
export type ProgramaEditor = { id: string; nome: string; observacoes: string | null; treinos: TreinoEditor[] };

const limpo = (v: string | null | undefined, max = 500) => {
  const s = (v ?? "").trim().slice(0, max);
  return s === "" ? null : s;
};
const inteiro = (v: unknown, min: number, max: number, padrao: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
};
const linkVideo = (v: string | null | undefined) => {
  const s = limpo(v, 300);
  return s && /^https?:\/\//i.test(s) ? s : null;
};

// Lista de exercícios -------------------------------------------------------------------

export async function salvarExercicio(e: Omit<ExercicioLista, "id"> & { id?: string }): Promise<{ erro?: string; id?: string }> {
  const { supabase } = await exigirProfessor();
  const nome = limpo(e.nome, 120);
  if (!nome) return { erro: "Dá um nome ao exercício." };
  const dados = {
    nome,
    grupo: grupoPadrao(e.grupo) ?? null,
    equipamento: limpo(e.equipamento, 80),
    video_url: linkVideo(e.video_url),
    metrica: e.metrica === "segundos" ? "segundos" : "reps",
    observacoes: limpo(e.observacoes),
  };
  if (e.video_url?.trim() && !dados.video_url) return { erro: "O link do vídeo precisa começar com https://" };

  const r = e.id
    ? await supabase.from("exercicios").update(dados).eq("id", e.id).select("id").single()
    : await supabase.from("exercicios").insert(dados).select("id").single();
  if (r.error) return { erro: r.error.code === "23505" ? "Já existe um exercício com esse nome." : "Não consegui salvar." };

  // Vídeo, nome e equipamento trocados aqui valem para todas as fichas que usam o exercício
  if (e.id) {
    await supabase
      .from("exercicios_treino")
      .update({ nome: dados.nome, grupo: dados.grupo, equipamento: dados.equipamento, video_url: dados.video_url, metrica: dados.metrica })
      .eq("exercicio_id", e.id);
  }
  revalidatePath("/professor/exercicios");
  return { id: r.data.id };
}

export async function excluirExercicio(id: string) {
  const { supabase } = await exigirProfessor();
  await supabase.from("exercicios").delete().eq("id", id); // as fichas guardam a própria cópia
  revalidatePath("/professor/exercicios");
}

// Programa do aluno ----------------------------------------------------------------------

function prescricaoValida(p: SemanaPrescrita[] | undefined): SemanaPrescrita[] {
  const lista = (p ?? []).slice(0, 16).map((s) => {
    const min = inteiro(s.min, 1, 999, 10);
    return { series: inteiro(s.series, 1, 20, 3), min, max: Math.max(min, inteiro(s.max, 1, 999, min)), pausa: inteiro(s.pausa, 0, 900, 60) };
  });
  return lista.length ? lista : [{ series: 3, min: 10, max: 12, pausa: 60 }];
}

/** Salva o programa inteiro do editor. `novo`: guarda o atual no histórico e começa outro (renovação, cópia). */
export async function salvarPrograma(alunoId: string, p: ProgramaEditor, novo: boolean): Promise<{ erro?: string; ok?: string }> {
  const { supabase } = await exigirProfessor();
  if (!limpo(p.nome)) return { erro: "Dá um nome ao programa (ex.: Ciclo 3 – Hipertrofia)." };
  if (!p.treinos.length) return { erro: "Adiciona pelo menos um treino." };
  const vazio = p.treinos.find((t) => !t.exercicios.length);
  if (vazio) return { erro: `O ${vazio.nome || "treino"} está sem exercícios.` };
  const semNome = p.treinos.flatMap((t) => t.exercicios).find((e) => !limpo(e.nome));
  if (semNome) return { erro: "Tem exercício sem nome." };

  // Exercício digitado que não está na lista entra nela (assim o vídeo fica cadastrado uma vez só)
  const { data: lista } = await supabase.from("exercicios").select("id, nome");
  const porNome = new Map((lista ?? []).map((e) => [e.nome.toLowerCase(), e.id]));
  const idsLista = new Set((lista ?? []).map((e) => e.id));
  for (const e of p.treinos.flatMap((t) => t.exercicios)) {
    if (e.exercicio_id && idsLista.has(e.exercicio_id)) continue;
    const nome = limpo(e.nome, 120)!;
    let id = porNome.get(nome.toLowerCase());
    if (!id) {
      const { data } = await supabase
        .from("exercicios")
        .insert({ nome, grupo: grupoPadrao(e.grupo), equipamento: limpo(e.equipamento, 80), video_url: linkVideo(e.video_url), metrica: e.metrica })
        .select("id")
        .single();
      id = data?.id;
      if (id) porNome.set(nome.toLowerCase(), id);
    }
    e.exercicio_id = id ?? null;
  }

  const { data: atual } = await supabase.from("programas").select("id").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle();
  const { data: ciclo } = await supabase.from("ciclos").select("id").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle();
  let programaId = atual?.id && !novo ? atual.id : null;

  if (programaId) {
    const { error } = await supabase.from("programas").update({ nome: limpo(p.nome, 120), observacoes: limpo(p.observacoes, 2000) }).eq("id", programaId);
    if (error) return { erro: "Não consegui salvar o programa." };
  } else {
    if (atual) await supabase.from("programas").update({ ativo: false }).eq("id", atual.id);
    const { data, error } = await supabase
      .from("programas")
      .insert({ aluno_id: alunoId, ciclo_id: ciclo?.id ?? null, nome: limpo(p.nome, 120), observacoes: limpo(p.observacoes, 2000) })
      .select("id")
      .single();
    if (error || !data) return { erro: "Não consegui criar o programa." };
    programaId = data.id;
  }

  // Ids dos que já existem são mantidos (o "Última vez" do aluno depende deles); os novos ganham um id agora
  const { data: antigos } = await supabase.from("treinos").select("id, exercicios_treino(id)").eq("programa_id", programaId);
  const treinosAntigos = new Set((antigos ?? []).map((t) => t.id));
  const exAntigos = new Set((antigos ?? []).flatMap((t) => t.exercicios_treino.map((e) => e.id)));
  const manter = (id: string, existentes: Set<string>) => (id && existentes.has(id) ? id : randomUUID());

  const treinos = p.treinos.map((t, i) => ({ ...t, id: manter(t.id, treinosAntigos), ordem: i + 1 }));
  const linhasTreino = treinos.map((t) => ({
    id: t.id, programa_id: programaId, aluno_id: alunoId, ordem: t.ordem, nome: limpo(t.nome, 60) ?? `Treino ${String.fromCharCode(64 + t.ordem)}`,
    foco: limpo(t.foco, 120), observacoes: limpo(t.observacoes, 2000),
  }));
  const linhasEx = treinos.flatMap((t) =>
    t.exercicios.map((e, j) => ({
      id: manter(e.id, exAntigos),
      treino_id: t.id,
      aluno_id: alunoId,
      ordem: j + 1,
      exercicio_id: e.exercicio_id,
      nome: limpo(e.nome, 120)!,
      grupo: grupoPadrao(e.grupo),
      equipamento: limpo(e.equipamento, 80),
      video_url: linkVideo(e.video_url),
      observacoes: limpo(e.observacoes, 1000),
      metrica: e.metrica === "segundos" ? "segundos" : "reps",
      aquecimento: inteiro(e.aquecimento, 0, 5, 0),
      superset: Boolean(e.superset) && j < t.exercicios.length - 1,
      prescricao: prescricaoValida(e.prescricao),
    })),
  );

  const r1 = await supabase.from("treinos").upsert(linhasTreino);
  if (r1.error) return { erro: "Não consegui salvar os treinos." };
  const r2 = await supabase.from("exercicios_treino").upsert(linhasEx);
  if (r2.error) return { erro: "Não consegui salvar os exercícios." };

  const exMantidos = new Set(linhasEx.map((e) => e.id));
  const exApagar = [...exAntigos].filter((id) => !exMantidos.has(id));
  if (exApagar.length) await supabase.from("exercicios_treino").delete().in("id", exApagar);
  const treinosApagar = [...treinosAntigos].filter((id) => !treinos.some((t) => t.id === id));
  if (treinosApagar.length) await supabase.from("treinos").delete().in("id", treinosApagar);

  revalidatePath(`/professor/alunos/${alunoId}/treino`);
  revalidatePath(`/professor/alunos/${alunoId}`);
  return { ok: novo || !atual ? "Programa novo salvo. O aluno já vê na aba Treino." : "Salvo. O aluno já vê as mudanças no próximo treino." };
}

/** Programa ativo de outro aluno, pronto para colar no editor (sem os ids, vira tudo novo). */
export async function programaParaCopiar(deAlunoId: string): Promise<ProgramaEditor | null> {
  const { supabase } = await exigirProfessor();
  const { data } = await supabase
    .from("programas")
    .select("nome, observacoes, treinos(nome, foco, observacoes, ordem, exercicios_treino(*))")
    .eq("aluno_id", deAlunoId)
    .eq("ativo", true)
    .maybeSingle();
  if (!data) return null;
  return {
    id: "",
    nome: data.nome,
    observacoes: data.observacoes,
    treinos: [...data.treinos]
      .sort((a, b) => a.ordem - b.ordem)
      .map((t) => ({
        id: "",
        nome: t.nome,
        foco: t.foco,
        observacoes: t.observacoes,
        exercicios: [...(t.exercicios_treino as (ExercicioEditor & { ordem: number })[])]
          .sort((a, b) => a.ordem - b.ordem)
          .map(({ ordem: _o, ...e }) => ({ ...e, id: "" })),
      })),
  };
}

/** Anotação / lembrete num exercício do aluno (o aluno vê na hora de treinar e pode completar). */
export async function salvarAnotacaoProfessor(alunoId: string, chave: string, nome: string, texto: string): Promise<{ erro?: string }> {
  const { supabase } = await exigirProfessor();
  const { error } = await supabase
    .from("anotacoes_exercicio")
    .upsert(
      { aluno_id: alunoId, chave: chave.slice(0, 200), nome: nome.slice(0, 200), texto: texto.trim().slice(0, 1000), atualizado_por: "professor", atualizado_em: new Date().toISOString() },
      { onConflict: "aluno_id,chave" },
    );
  if (error) return { erro: "Não consegui salvar." };
  revalidatePath(`/professor/alunos/${alunoId}/treino`);
  return {};
}

/** Cardio do programa ativo (sessões da semana e o texto de cada semana do ciclo). */
export async function salvarCardio(alunoId: string, programaId: string, cardio: Cardio): Promise<{ erro?: string; ok?: string }> {
  const { supabase } = await exigirProfessor();
  const sessoes = (cardio.sessoes ?? [])
    .map((s) => ({ nome: String(s.nome ?? "").trim().slice(0, 80), semanas: (s.semanas ?? []).slice(0, 16).map((t) => String(t ?? "").trim().slice(0, 300)) }))
    .filter((s) => s.nome);
  const valor = sessoes.length || cardio.orientacoes?.trim() ? { orientacoes: limpo(cardio.orientacoes, 3000), sessoes } : null;
  const { error } = await supabase.from("programas").update({ cardio: valor }).eq("id", programaId).eq("aluno_id", alunoId);
  if (error) return { erro: "Não consegui salvar o cardio." };
  revalidatePath(`/professor/alunos/${alunoId}/treino`);
  return { ok: "Cardio salvo." };
}
