import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, ClipboardList, Dumbbell, Eye, Home, Menu, PlayCircle, Trophy } from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { carregarPainelAluno } from "@/lib/dados-aluno";
import { situacaoDoCiclo } from "@/lib/ciclo";
import { dataBR } from "@/lib/formato";
import { lerAnotacoes, montarUltimaVez, planoDoDia, type ExercicioFicha } from "@/lib/treino";
import { InicioAluno } from "@/components/inicio-aluno";
import { ExecucaoTreino } from "@/components/aluno/execucao-treino";
import { Selo, Vazio } from "@/components/ui";
import type { Ciclo } from "@/lib/tipos";

export const metadata = { title: "Visão do aluno · Painel do Professor" };

const ABAS = [
  { aba: "inicio", rotulo: "Início", icone: Home },
  { aba: "treino", rotulo: "Treino", icone: Dumbbell },
  { aba: "checkin", rotulo: "Check-in", icone: ClipboardList },
  { aba: "conquistas", rotulo: "Conquistas", icone: Trophy },
  { aba: "mais", rotulo: "Mais", icone: Menu },
] as const;

/** "Ver como o aluno": o app como ele vê no celular, com a barra de baixo. O treino abre em prévia (nada é salvo). */
export default async function VisaoDoAluno({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string; t?: string }> }) {
  const { id } = await params;
  const { aba = "inicio", t } = await searchParams;
  const { supabase } = await exigirProfessor();
  const painel = await carregarPainelAluno(supabase, { alunoId: id });
  if (!painel) notFound();
  const base = `/professor/alunos/${id}/visao`;

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-[420px] flex-wrap items-center justify-between gap-2 rounded-xl bg-marca-suave px-4 py-3 text-sm text-marca">
        <span className="flex items-center gap-2 font-semibold"><Eye className="size-4" /> Como {painel.aluno.nome.split(" ")[0]} vê no celular</span>
        <Link href={`/professor/alunos/${id}`} className="inline-flex items-center gap-1 font-semibold"><ArrowLeft className="size-4" /> Voltar à ficha</Link>
      </div>

      <div className="mx-auto flex h-[min(860px,calc(100dvh-9rem))] max-w-[420px] flex-col overflow-hidden rounded-[2rem] border-8 border-menu bg-fundo shadow-xl">
        <div className="flex-1 overflow-y-auto p-4">
          {aba === "inicio" && <InicioAluno painel={painel} preview />}
          {aba === "treino" && (t ? <PreviaTreino alunoId={id} treinoId={t} voltar={`${base}?aba=treino`} whatsapp={painel.contato.whatsapp} primeiroNome={painel.aluno.nome.split(" ")[0]} /> : <ListaTreinos alunoId={id} base={base} />)}
          {!["inicio", "treino"].includes(aba) && (
            <Vazio icone={Eye} titulo="Prévia desta aba ainda não disponível">
              Por enquanto a visão do aluno mostra o Início e o Treino.
            </Vazio>
          )}
        </div>
        <nav className="border-t border-white/10 bg-menu">
          <ul className="grid grid-cols-5">
            {ABAS.map(({ aba: a, rotulo, icone: Icone }) => (
              <li key={a}>
                <Link href={`${base}?aba=${a}`} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${aba === a ? "text-white" : "text-menu-texto/55"}`}>
                  <span className={`grid h-7 w-12 place-items-center rounded-full ${aba === a ? "bg-marca" : ""}`}><Icone className="size-5" /></span>
                  {rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

/** Igual à aba Treino do aluno; "Começar" abre a prévia em vez de começar de verdade. */
async function ListaTreinos({ alunoId, base }: { alunoId: string; base: string }) {
  const { supabase } = await exigirProfessor();
  const [programaR, execR, cicloR] = await Promise.all([
    supabase.from("programas").select("nome, observacoes, treinos(id, ordem, nome, foco, exercicios_treino(count))").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle(),
    supabase.from("execucoes").select("treino_id, concluida_em").eq("aluno_id", alunoId).not("concluida_em", "is", null).order("concluida_em", { ascending: false }).limit(30),
    supabase.from("ciclos").select("*").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle<Ciclo>(),
  ]);
  const programa = programaR.data;
  if (!programa) {
    return <Vazio icone={Dumbbell} titulo="Sem treino no app">O aluno vê o botão do app de treino de antes (MFIT ou treino.io).</Vazio>;
  }
  const treinos = [...programa.treinos].sort((a, b) => a.ordem - b.ordem);
  const feitas = execR.data ?? [];
  const ultimo = feitas.find((e) => treinos.some((x) => x.id === e.treino_id));
  const iUltimo = ultimo ? treinos.findIndex((x) => x.id === ultimo.treino_id) : -1;
  const proximoId = treinos.length ? treinos[(iUltimo + 1) % treinos.length].id : null;
  const sit = situacaoDoCiclo(cicloR.data);

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-2xl font-bold">Treino</h1>
        <p className="text-sm text-texto-suave">{programa.nome}{sit.tipo === "em_andamento" && ` · semana ${sit.semana} de ${sit.total}`}</p>
      </div>
      {programa.observacoes && <p className="cartao whitespace-pre-line p-4 text-sm">{programa.observacoes}</p>}
      <ul className="space-y-3">
        {treinos.map((x) => {
          const total = (x.exercicios_treino as unknown as { count: number }[])[0]?.count ?? 0;
          const ultimaVez = feitas.find((e) => e.treino_id === x.id)?.concluida_em;
          return (
            <li key={x.id} className={`cartao p-4 ${x.id === proximoId ? "border-marca" : ""}`}>
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-marca-suave text-lg font-bold text-marca">{x.nome.replace(/^treino\s*/i, "").slice(0, 2) || x.ordem}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">{x.nome} {x.id === proximoId && <Selo tom="marca">Próximo</Selo>}</p>
                  {x.foco && <p className="text-sm text-texto-suave">{x.foco}</p>}
                  <p className="mt-1 text-xs text-texto-suave">{total} exercício{total === 1 ? "" : "s"}{ultimaVez && ` · última vez ${dataBR(ultimaVez)}`}</p>
                </div>
              </div>
              <Link href={`${base}?aba=treino&t=${x.id}`} className={`${x.id === proximoId ? "botao" : "botao-secundario"} mt-3 w-full`}>
                <PlayCircle className="size-4" /> Começar <span className="text-xs font-normal opacity-80">(prévia)</span> <ChevronRight className="size-4" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A tela do treino com a prescrição desta semana e o "Última vez" do aluno; nada é salvo. */
async function PreviaTreino({ alunoId, treinoId, voltar, whatsapp, primeiroNome }: { alunoId: string; treinoId: string; voltar: string; whatsapp: string | null; primeiroNome: string }) {
  const { supabase } = await exigirProfessor();
  const [treinoR, cicloR] = await Promise.all([
    supabase.from("treinos").select("id, nome, foco, exercicios_treino(*)").eq("id", treinoId).eq("aluno_id", alunoId).maybeSingle(),
    supabase.from("ciclos").select("*").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle<Ciclo>(),
  ]);
  if (!treinoR.data) notFound();
  const sit = situacaoDoCiclo(cicloR.data);
  const semana = sit.tipo === "em_andamento" ? sit.semana : sit.tipo === "nao_iniciado" ? 1 : null;
  const plano = planoDoDia(treinoR.data.exercicios_treino as ExercicioFicha[], semana);

  const { data: anteriores } = await supabase
    .from("series_feitas")
    .select("execucao_id, exercicio_id, numero, carga, reps, segundos, unidade, feita_em")
    .eq("aluno_id", alunoId)
    .eq("aquecimento", false)
    .in("exercicio_id", plano.map((e) => e.id))
    .order("feita_em", { ascending: false })
    .limit(400);
  const ultimaVez = montarUltimaVez(anteriores ?? []);
  const anotacoes = await lerAnotacoes(supabase, alunoId);

  const agora = new Date().toISOString();
  return (
    <ExecucaoTreino
      key={treinoId}
      execucaoId={`previa-${treinoId}`}
      nome={treinoR.data.foco ? `${treinoR.data.nome} · ${treinoR.data.foco}` : treinoR.data.nome}
      semana={semana}
      iniciadaEm={agora}
      plano={plano}
      feitas={[]}
      ultimaVez={ultimaVez}
      anotacoes={anotacoes}
      pausaAte={null}
      agoraServidor={agora}
      whatsapp={whatsapp}
      primeiroNome={primeiroNome}
      previa={{ voltar }}
    />
  );
}
