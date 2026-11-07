import { notFound, redirect } from "next/navigation";
import { exigirProfessor } from "@/lib/sessao";
import { ExecucaoTreino, type SerieSalva } from "@/components/aluno/execucao-treino";
import { lerAnotacoes, montarUltimaVez, type ExercicioPlano } from "@/lib/treino";
import { salvarAnotacaoProfessor } from "../../../../treino-acoes";
import {
  ajustarPausaPersonal, concluirTreinoPersonal, descartarTreinoPersonal, desmarcarSeriePersonal, marcarSeriePersonal,
} from "../../../../personal-acoes";

export const metadata = { title: "Aula · Painel do Professor" };

/** A mesma tela de treino do aluno, mas quem marca é o professor durante a aula presencial. */
export default async function AulaPersonal({ params }: { params: Promise<{ id: string; exec: string }> }) {
  const { id, exec: execId } = await params;
  const { supabase } = await exigirProfessor();
  const { data: exec } = await supabase.from("execucoes").select("id, aluno_id, nome_treino, semana, plano, iniciada_em, concluida_em").eq("id", execId).eq("aluno_id", id).maybeSingle();
  if (!exec) notFound();
  if (exec.concluida_em) redirect(`/professor/alunos/${id}/personal?concluido=${exec.id}`);

  const plano = exec.plano as ExercicioPlano[];
  const [feitasR, anterioresR, alunoR] = await Promise.all([
    supabase.from("series_feitas").select("exercicio_id, numero, aquecimento, carga, reps, segundos, unidade").eq("execucao_id", exec.id),
    supabase
      .from("series_feitas")
      .select("execucao_id, exercicio_id, numero, carga, reps, segundos, unidade, feita_em")
      .eq("aluno_id", id)
      .eq("aquecimento", false)
      .neq("execucao_id", exec.id)
      .in("exercicio_id", plano.map((e) => e.id))
      .order("feita_em", { ascending: false })
      .limit(400),
    supabase.from("alunos").select("nome").eq("id", id).maybeSingle(),
  ]);
  const anotacoes = await lerAnotacoes(supabase, id);

  return (
    <ExecucaoTreino
      execucaoId={exec.id}
      nome={`${exec.nome_treino} · ${alunoR.data?.nome?.split(" ")[0] ?? "aluno"}`}
      semana={exec.semana}
      iniciadaEm={exec.iniciada_em}
      plano={plano}
      feitas={(feitasR.data ?? []) as SerieSalva[]}
      ultimaVez={montarUltimaVez(anterioresR.data ?? [])}
      anotacoes={anotacoes}
      pausaAte={null}
      agoraServidor={new Date().toISOString()}
      whatsapp={null}
      primeiroNome={alunoR.data?.nome?.split(" ")[0] ?? ""}
      personal={{
        voltar: `/professor/alunos/${id}/personal`,
        acoes: {
          marcarSerie: marcarSeriePersonal.bind(null, id),
          desmarcarSerie: desmarcarSeriePersonal.bind(null, id),
          ajustarPausa: ajustarPausaPersonal,
          concluirTreino: concluirTreinoPersonal.bind(null, id),
          descartarTreino: descartarTreinoPersonal.bind(null, id),
          salvarAnotacao: salvarAnotacaoProfessor.bind(null, id),
        },
      }}
    />
  );
}
