import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Dumbbell, HeartPulse, History, MessageSquareText, NotebookPen } from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { situacaoDoCiclo } from "@/lib/ciclo";
import { dataBR } from "@/lib/formato";
import { Cartao, Selo, TituloCartao, Vazio } from "@/components/ui";
import { EditorPrograma } from "@/components/professor/editor-programa";
import type { ExercicioEditor, ExercicioLista, ProgramaEditor } from "../../../treino-acoes";
import { chaveAnotacao, esforcoDe, lerAnotacoes, type Cardio, type ExercicioPlano } from "@/lib/treino";
import { AnotacaoExercicio } from "@/components/anotacao-exercicio";
import { EditorCardio } from "@/components/professor/editor-cardio";
import { salvarAnotacaoProfessor, salvarCardio } from "../../../treino-acoes";
import type { Ciclo } from "@/lib/tipos";

export const metadata = { title: "Treino do aluno · Painel do Professor" };

const br = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));

export default async function TreinoDoAluno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirProfessor();

  const { data: aluno } = await supabase.from("alunos").select("id, nome").eq("id", id).maybeSingle();
  if (!aluno) notFound();

  const [programa, biblioteca, ciclo, outros, execucoes] = await Promise.all([
    supabase.from("programas").select("id, nome, observacoes, cardio, treinos(id, ordem, nome, foco, observacoes, exercicios_treino(*))").eq("aluno_id", id).eq("ativo", true).maybeSingle(),
    supabase.from("exercicios").select("id, nome, grupo, equipamento, video_url, metrica, observacoes").order("nome"),
    supabase.from("ciclos").select("*").eq("aluno_id", id).eq("ativo", true).maybeSingle<Ciclo>(),
    supabase.from("programas").select("aluno_id, alunos!inner(nome)").eq("ativo", true).neq("aluno_id", id),
    supabase
      .from("execucoes")
      .select("id, nome_treino, semana, plano, iniciada_em, concluida_em, esforco, comentario, series_feitas(exercicio_id, numero, aquecimento, carga, reps, segundos, unidade)")
      .eq("aluno_id", id)
      .order("iniciada_em", { ascending: false })
      .limit(20),
  ]);

  const inicial: ProgramaEditor | null = programa.data
    ? {
        id: programa.data.id,
        nome: programa.data.nome,
        observacoes: programa.data.observacoes,
        treinos: [...programa.data.treinos]
          .sort((a, b) => a.ordem - b.ordem)
          .map((t) => ({
            id: t.id,
            nome: t.nome,
            foco: t.foco,
            observacoes: t.observacoes,
            exercicios: [...(t.exercicios_treino as (ExercicioEditor & { ordem: number })[])].sort((a, b) => a.ordem - b.ordem),
          })),
      }
    : null;

  const c = ciclo.data;
  const s = situacaoDoCiclo(c);
  const semanas = c?.semanas || 8;
  const nomeSugerido = c ? `Ciclo ${c.numero}` : "Programa de treino";
  const outrosAlunos = (outros.data ?? [])
    .map((o) => ({ id: o.aluno_id, nome: (o.alunos as unknown as { nome: string }).nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const lista = execucoes.data ?? [];
  const anotacoes = await lerAnotacoes(supabase, id);
  // Exercícios do programa ativo, sem repetir (o mesmo exercício pode estar em dois treinos)
  const exerciciosPrograma = [...new Map((inicial?.treinos ?? []).flatMap((t) => t.exercicios).map((e) => [chaveAnotacao(e), e])).values()];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <Link href={`/professor/alunos/${id}`} className="inline-flex items-center gap-1 text-sm text-texto-suave"><ArrowLeft className="size-4" /> {aluno.nome}</Link>
        <h1 className="text-2xl font-bold">Treino</h1>
        <p className="text-sm text-texto-suave">
          {s.tipo === "em_andamento" ? `Semana ${s.semana} de ${s.total} do ciclo ${c!.numero}.` : c ? `Ciclo ${c.numero}.` : "Sem ciclo ativo: a prescrição por semana usa a 1ª semana."}{" "}
          O aluno vê o programa na aba Treino do app assim que você salvar.
        </p>
      </header>

      <EditorPrograma
        alunoId={id}
        inicial={inicial}
        biblioteca={(biblioteca.data ?? []) as ExercicioLista[]}
        semanasCiclo={semanas}
        nomeSugerido={nomeSugerido}
        outrosAlunos={outrosAlunos}
      />

      {programa.data && (
        <Cartao>
          <TituloCartao icone={HeartPulse}>Cardio</TituloCartao>
          <p className="mb-3 text-sm text-texto-suave">O aluno vê na aba Treino só o cardio da semana dele e marca quando fizer.</p>
          <EditorCardio inicial={(programa.data.cardio as Cardio | null) ?? null} semanas={semanas} salvar={salvarCardio.bind(null, id, programa.data.id)} />
        </Cartao>
      )}

      {exerciciosPrograma.length > 0 && (
        <Cartao>
          <TituloCartao icone={NotebookPen}>Anotações por exercício</TituloCartao>
          <p className="mb-3 text-sm text-texto-suave">Lembretes de ajuste e posição. O aluno vê na hora de treinar e também pode escrever. Valem nos próximos ciclos.</p>
          <ul className="divide-y divide-borda">
            {exerciciosPrograma.map((e) => (
              <li key={chaveAnotacao(e)} className="py-2">
                <p className="text-sm font-medium">{e.nome}</p>
                <AnotacaoExercicio
                  chave={chaveAnotacao(e)}
                  nome={e.nome}
                  inicial={anotacoes[chaveAnotacao(e)] ?? null}
                  quem="professor"
                  salvar={salvarAnotacaoProfessor.bind(null, id)}
                />
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <Cartao>
        <TituloCartao icone={History}>O que o aluno fez</TituloCartao>
        {!lista.length ? (
          <Vazio icone={Dumbbell} titulo="Nenhum treino feito pelo app ainda" />
        ) : (
          <ul className="space-y-2">
            {lista.map((ex) => {
              const plano = ex.plano as ExercicioPlano[];
              const validas = ex.series_feitas.filter((f) => !f.aquecimento);
              const total = plano.reduce((t, e) => t + e.series, 0);
              const minutos = ex.concluida_em ? Math.round((Date.parse(ex.concluida_em) - Date.parse(ex.iniciada_em)) / 60000) : null;
              return (
                <li key={ex.id}>
                  <details className="rounded-xl border border-borda">
                    <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
                      <span className="font-semibold">{dataBR(ex.iniciada_em.slice(0, 10))}</span>
                      <span>{ex.nome_treino}</span>
                      {ex.semana && <span className="text-texto-suave">sem. {ex.semana}</span>}
                      <span className="text-texto-suave">{validas.length}/{total} séries{minutos != null && minutos < 600 ? ` · ${minutos} min` : ""}</span>
                      {!ex.concluida_em && <Selo tom="alerta">em andamento</Selo>}
                      {ex.esforco && <Selo tom={ex.esforco >= 9 ? "alerta" : "neutro"}>{esforcoDe(ex.esforco)?.emoji} {esforcoDe(ex.esforco)?.rotulo}</Selo>}
                      {ex.comentario && <MessageSquareText className="size-4 text-marca" aria-label="Deixou recado" />}
                    </summary>
                    <div className="space-y-2 border-t border-borda p-3 text-sm">
                      {ex.comentario && <p className="rounded-lg bg-marca-suave p-2 text-marca">“{ex.comentario}”</p>}
                      {plano.map((e) => {
                        const feitas = validas.filter((f) => f.exercicio_id === e.id).sort((a, b) => a.numero - b.numero);
                        return (
                          <div key={e.id} className="flex flex-wrap gap-x-2">
                            <span className="font-medium">{e.nome}:</span>
                            <span className="text-texto-suave">
                              {feitas.length
                                ? feitas.map((f) => `${f.carga != null ? `${br(f.carga)} ${f.unidade ?? "kg"} × ` : ""}${e.metrica === "segundos" ? `${f.segundos ?? "-"} s` : f.reps ?? "-"}`).join(" · ")
                                : "não fez"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
