import { notFound, redirect } from "next/navigation";
import { exigirAluno } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/servidor";
import { ExecucaoTreino, type SerieSalva } from "@/components/aluno/execucao-treino";
import { lerAnotacoes, montarUltimaVez, type ExercicioPlano } from "@/lib/treino";

export default async function SessaoTreino({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await exigirAluno();
  const { data: exec } = await s.supabase.from("execucoes").select("id, aluno_id, nome_treino, semana, plano, iniciada_em, concluida_em").eq("id", id).maybeSingle();
  if (!exec) notFound();
  if (exec.concluida_em) redirect(`/treino?concluido=${exec.id}`);

  const plano = exec.plano as ExercicioPlano[];
  const ids = plano.map((e) => e.id);

  const [feitasR, anterioresR, pausaR, alunoR, zapR] = await Promise.all([
    s.supabase.from("series_feitas").select("exercicio_id, numero, aquecimento, carga, reps, segundos, unidade").eq("execucao_id", exec.id),
    // Última vez de cada exercício (séries válidas de outros treinos)
    s.supabase
      .from("series_feitas")
      .select("execucao_id, exercicio_id, numero, carga, reps, segundos, unidade, feita_em")
      .eq("aluno_id", exec.aluno_id)
      .eq("aquecimento", false)
      .neq("execucao_id", exec.id)
      .in("exercicio_id", ids)
      .order("feita_em", { ascending: false })
      .limit(400),
    clienteAdmin().from("pausas").select("termina_em").eq("user_id", s.user.id).eq("execucao_id", exec.id).is("enviada_em", null).is("cancelada_em", null).order("termina_em", { ascending: false }).limit(1).maybeSingle(),
    s.supabase.from("alunos").select("nome").eq("id", exec.aluno_id).maybeSingle(),
    s.supabase.from("configuracoes").select("valor").eq("chave", "whatsapp_carlos").maybeSingle(),
  ]);

  const ultimaVez = montarUltimaVez(anterioresR.data ?? []);
  const anotacoes = await lerAnotacoes(s.supabase, exec.aluno_id);

  return (
    <ExecucaoTreino
      execucaoId={exec.id}
      nome={exec.nome_treino}
      semana={exec.semana}
      iniciadaEm={exec.iniciada_em}
      plano={plano}
      feitas={(feitasR.data ?? []) as SerieSalva[]}
      ultimaVez={ultimaVez}
      anotacoes={anotacoes}
      pausaAte={pausaR.data?.termina_em ?? null}
      agoraServidor={new Date().toISOString()}
      whatsapp={(zapR.data?.valor as string | null) || null}
      primeiroNome={alunoR.data?.nome?.split(" ")[0] ?? ""}
    />
  );
}
