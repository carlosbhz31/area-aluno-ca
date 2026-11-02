import Link from "next/link";
import { CheckCircle2, ChevronRight, Dumbbell, History, PlayCircle } from "lucide-react";
import { exigirAluno } from "@/lib/sessao";
import { APPS_PADRAO } from "@/lib/dados-aluno";
import { dataBR } from "@/lib/formato";
import { situacaoDoCiclo } from "@/lib/ciclo";
import { BotaoTreino } from "@/components/botao-treino";
import { AtivarAvisos } from "@/components/aluno/ativar-avisos";
import { Selo, Vazio } from "@/components/ui";
import type { AppsTreino, Ciclo } from "@/lib/tipos";
import { RelatorioTreino } from "@/components/aluno/relatorio-treino";
import { relatorioTreino, type ExercicioPlano } from "@/lib/treino";
import { iniciarTreino } from "./acoes";

type Execucao = { id: string; treino_id: string | null; nome_treino: string; iniciada_em: string; concluida_em: string | null };

/** Dados do relatório do treino que acabou de ser concluído: séries de hoje x treinos anteriores. */
async function montarRelatorio(supabase: Awaited<ReturnType<typeof exigirAluno>>["supabase"], alunoId: string, exec: Execucao, feitas: Execucao[]) {
  const { data: e } = await supabase.from("execucoes").select("plano").eq("id", exec.id).maybeSingle();
  const plano = (e?.plano ?? []) as ExercicioPlano[];
  if (!plano.length) return null;
  const [hojeR, antesR] = await Promise.all([
    supabase.from("series_feitas").select("exercicio_id, numero, carga, reps, segundos").eq("execucao_id", exec.id).eq("aquecimento", false),
    supabase
      .from("series_feitas")
      .select("execucao_id, exercicio_id, numero, carga, reps, segundos, feita_em")
      .eq("aluno_id", alunoId)
      .eq("aquecimento", false)
      .neq("execucao_id", exec.id)
      .lt("feita_em", exec.iniciada_em)
      .in("exercicio_id", plano.map((x) => x.id))
      .order("feita_em", { ascending: false })
      .limit(600),
  ]);
  const hoje = hojeR.data ?? [];
  if (!hoje.length) return null;
  const antes = antesR.data ?? [];
  const r = relatorioTreino(plano, hoje, antes);

  // Volume da última vez deste mesmo treino
  const anterior = exec.treino_id ? feitas.find((x) => x.treino_id === exec.treino_id && x.id !== exec.id && x.iniciada_em < exec.iniciada_em) : null;
  const linhasAnt = anterior ? antes.filter((x) => x.execucao_id === anterior.id) : [];
  const seg = new Set(plano.filter((x) => x.metrica === "segundos").map((x) => x.id));
  const volumeAntes = linhasAnt.length ? Math.round(linhasAnt.filter((x) => !seg.has(x.exercicio_id)).reduce((t, x) => t + (x.carga ?? 0) * (x.reps ?? 0), 0)) : null;

  const min = Math.round((Date.parse(exec.concluida_em!) - Date.parse(exec.iniciada_em)) / 60000);
  return { nome: exec.nome_treino, minutos: min > 0 && min < 300 ? min : null, series: hoje.length, volume: r.volume, volumeAntes, itens: r.itens, evoluiu: r.evoluiu };
}

export default async function Treino({ searchParams }: { searchParams: Promise<{ concluido?: string; erro?: string }> }) {
  const { concluido, erro } = await searchParams;
  const s = await exigirAluno();
  const { data: aluno } = await s.supabase.from("alunos").select("id, app_treino, app_treino_link").eq("user_id", s.user.id).maybeSingle();
  if (!aluno) return null;

  const [programaR, execR, cicloR, cfgR] = await Promise.all([
    s.supabase.from("programas").select("id, nome, observacoes, treinos(id, ordem, nome, foco, exercicios_treino(count))").eq("aluno_id", aluno.id).eq("ativo", true).maybeSingle(),
    s.supabase.from("execucoes").select("id, treino_id, nome_treino, iniciada_em, concluida_em, series_feitas(count)").eq("aluno_id", aluno.id).order("iniciada_em", { ascending: false }).limit(30),
    s.supabase.from("ciclos").select("*").eq("aluno_id", aluno.id).eq("ativo", true).maybeSingle<Ciclo>(),
    s.supabase.from("configuracoes").select("valor").eq("chave", "apps_treino").maybeSingle(),
  ]);
  const programa = programaR.data;
  const execucoes = execR.data ?? [];
  const treinos = [...(programa?.treinos ?? [])].sort((a, b) => a.ordem - b.ordem);
  const aberta = execucoes.find((e) => !e.concluida_em);
  const feitas = execucoes.filter((e) => e.concluida_em);
  const sit = situacaoDoCiclo(cicloR.data);

  // Próximo da rotação: o que vem depois do último treino concluído
  const ultimo = feitas.find((e) => treinos.some((t) => t.id === e.treino_id));
  const iUltimo = ultimo ? treinos.findIndex((t) => t.id === ultimo.treino_id) : -1;
  const proximoId = treinos.length ? treinos[(iUltimo + 1) % treinos.length].id : null;
  const ultimaVez = new Map<string, string>();
  for (const e of feitas) if (e.treino_id && !ultimaVez.has(e.treino_id)) ultimaVez.set(e.treino_id, e.concluida_em!);
  const recemConcluido = concluido ? feitas.find((e) => e.id === concluido) : null;
  const relatorio = recemConcluido ? await montarRelatorio(s.supabase, aluno.id, recemConcluido, feitas) : null;

  if (!programa) {
    const apps = { ...APPS_PADRAO, ...((cfgR.data?.valor as AppsTreino) ?? {}) };
    const app = aluno.app_treino ? apps[aluno.app_treino as keyof AppsTreino] : null;
    return (
      <div className="mx-auto max-w-xl space-y-4 pt-2">
        <h1 className="text-2xl font-bold">Treino</h1>
        <section className="cartao p-5">
          <Vazio icone={Dumbbell} titulo="Seu treino ainda não está aqui">
            Estou trazendo os treinos para dentro do app. Por enquanto, segue pelo {app?.nome ?? "app de treino"}.
          </Vazio>
          {app && <BotaoTreino app={app} linkIndividual={aluno.app_treino_link} className="mt-4" />}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 pt-2">
      <div>
        <h1 className="text-2xl font-bold">Treino</h1>
        <p className="text-sm text-texto-suave">
          {programa.nome}
          {sit.tipo === "em_andamento" && ` · semana ${sit.semana} de ${sit.total}`}
        </p>
      </div>

      {recemConcluido && (relatorio ? (
        <RelatorioTreino {...relatorio} />
      ) : (
        <section className="cartao flex items-center gap-3 border-ok/40 bg-ok-suave p-4 text-sm">
          <CheckCircle2 className="size-6 shrink-0 text-ok" />
          <p><strong>Treino concluído!</strong> {recemConcluido.nome_treino} registrado. Bom trabalho.</p>
        </section>
      ))}
      {erro && <p className="cartao p-4 text-sm text-perigo">Não consegui começar o treino. Tenta de novo.</p>}

      {aberta && (
        <Link href={`/treino/sessao/${aberta.id}`} className="cartao flex items-center gap-3 border-marca p-4">
          <PlayCircle className="size-8 shrink-0 text-marca" />
          <span className="flex-1">
            <span className="block font-semibold">Continuar treino</span>
            <span className="text-sm text-texto-suave">{aberta.nome_treino}</span>
          </span>
          <ChevronRight className="size-5 text-texto-suave" />
        </Link>
      )}

      <AtivarAvisos compacto />

      {programa.observacoes && <p className="cartao whitespace-pre-line p-4 text-sm">{programa.observacoes}</p>}

      <ul className="space-y-3">
        {treinos.map((t) => {
          const total = (t.exercicios_treino as unknown as { count: number }[])[0]?.count ?? 0;
          return (
            <li key={t.id}>
              <form action={iniciarTreino.bind(null, t.id)} className={`cartao p-4 ${t.id === proximoId ? "border-marca" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-marca-suave text-lg font-bold text-marca">
                    {t.nome.replace(/^treino\s*/i, "").slice(0, 2) || t.ordem}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {t.nome} {t.id === proximoId && <Selo tom="marca">Próximo</Selo>}
                    </p>
                    {t.foco && <p className="text-sm text-texto-suave">{t.foco}</p>}
                    <p className="mt-1 text-xs text-texto-suave">
                      {total} exercício{total === 1 ? "" : "s"}
                      {ultimaVez.has(t.id) && ` · última vez ${dataBR(ultimaVez.get(t.id))}`}
                    </p>
                  </div>
                </div>
                <button className={`${t.id === proximoId ? "botao" : "botao-secundario"} mt-3 w-full`}>
                  <PlayCircle className="size-4" /> {aberta?.treino_id === t.id ? "Continuar" : "Começar"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      {feitas.length > 0 && (
        <section className="cartao p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-texto-suave"><History className="size-4" /> Últimos treinos</h2>
          <ul className="divide-y divide-borda text-sm">
            {feitas.slice(0, 8).map((e) => {
              const min = Math.round((Date.parse(e.concluida_em!) - Date.parse(e.iniciada_em)) / 60000);
              const series = (e.series_feitas as unknown as { count: number }[])[0]?.count ?? 0;
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{e.nome_treino}</span>
                  <span className="shrink-0 text-texto-suave">{dataBR(e.concluida_em)} · {series} séries{min > 0 && min < 300 ? ` · ${min} min` : ""}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
