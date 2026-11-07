import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronRight, Dumbbell, PlayCircle } from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { situacaoDoCiclo } from "@/lib/ciclo";
import { dataBR } from "@/lib/formato";
import { Selo, Vazio } from "@/components/ui";
import type { Ciclo } from "@/lib/tipos";
import { iniciarTreinoPersonal } from "../../../personal-acoes";

export const metadata = { title: "Treinar com o aluno · Painel do Professor" };

/** Modo personal: escolhe o treino do aluno presencial e registra a aula no celular do professor. */
export default async function Personal({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ concluido?: string; erro?: string }> }) {
  const { id } = await params;
  const { concluido, erro } = await searchParams;
  const { supabase } = await exigirProfessor();

  const { data: aluno } = await supabase.from("alunos").select("id, nome").eq("id", id).maybeSingle();
  if (!aluno) notFound();
  const [programaR, execR, cicloR] = await Promise.all([
    supabase.from("programas").select("id, nome, treinos(id, ordem, nome, foco, exercicios_treino(count))").eq("aluno_id", id).eq("ativo", true).maybeSingle(),
    supabase.from("execucoes").select("id, treino_id, nome_treino, iniciada_em, concluida_em, series_feitas(count)").eq("aluno_id", id).order("iniciada_em", { ascending: false }).limit(20),
    supabase.from("ciclos").select("*").eq("aluno_id", id).eq("ativo", true).maybeSingle<Ciclo>(),
  ]);
  const programa = programaR.data;
  const execucoes = execR.data ?? [];
  const treinos = [...(programa?.treinos ?? [])].sort((a, b) => a.ordem - b.ordem);
  const aberta = execucoes.find((e) => !e.concluida_em);
  const feitas = execucoes.filter((e) => e.concluida_em);
  const ultimo = feitas.find((e) => treinos.some((t) => t.id === e.treino_id));
  const iUltimo = ultimo ? treinos.findIndex((t) => t.id === ultimo.treino_id) : -1;
  const proximoId = treinos.length ? treinos[(iUltimo + 1) % treinos.length].id : null;
  const sit = situacaoDoCiclo(cicloR.data);
  const recem = concluido ? feitas.find((e) => e.id === concluido) : null;
  const primeiro = aluno.nome.split(" ")[0];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href={`/professor/alunos/${id}`} className="inline-flex items-center gap-1 text-sm text-texto-suave"><ArrowLeft className="size-4" /> {aluno.nome}</Link>
      <div>
        <h1 className="text-2xl font-bold">Treinar com {primeiro}</h1>
        <p className="text-sm text-texto-suave">
          Você marca as séries na aula; fica no histórico de {primeiro} e as cargas valem para quando treinar sozinho.
          {sit.tipo === "em_andamento" && ` Semana ${sit.semana} de ${sit.total}.`}
        </p>
      </div>

      {recem && (
        <p className="cartao flex items-center gap-3 border-ok/40 bg-ok-suave p-4 text-sm">
          <CheckCircle2 className="size-6 shrink-0 text-ok" /> <span><b>Aula registrada.</b> {recem.nome_treino} ficou no histórico de {primeiro}.</span>
        </p>
      )}
      {erro && <p className="cartao p-4 text-sm text-perigo">Não consegui começar o treino. Tenta de novo.</p>}

      {aberta && (
        <Link href={`/professor/alunos/${id}/personal/${aberta.id}`} className="cartao flex items-center gap-3 border-marca p-4">
          <PlayCircle className="size-8 shrink-0 text-marca" />
          <span className="flex-1">
            <span className="block font-semibold">Continuar treino aberto</span>
            <span className="text-sm text-texto-suave">{aberta.nome_treino} · começou {dataBR(aberta.iniciada_em.slice(0, 10))}</span>
          </span>
          <ChevronRight className="size-5 text-texto-suave" />
        </Link>
      )}

      {!programa ? (
        <section className="cartao p-5">
          <Vazio icone={Dumbbell} titulo="Sem programa no app">
            Monte o treino de {primeiro} em <Link href={`/professor/alunos/${id}/treino`} className="text-marca">Treino</Link> para registrar as aulas aqui.
          </Vazio>
        </section>
      ) : (
        <ul className="space-y-3">
          {[...treinos].sort((a, b) => Number(b.id === proximoId) - Number(a.id === proximoId)).map((t) => {
            const total = (t.exercicios_treino as unknown as { count: number }[])[0]?.count ?? 0;
            const ultimaVez = feitas.find((e) => e.treino_id === t.id)?.concluida_em;
            return (
              <li key={t.id}>
                <form action={iniciarTreinoPersonal.bind(null, id, t.id)} className={`cartao p-4 ${t.id === proximoId ? "border-marca" : ""}`}>
                  <p className="flex flex-wrap items-center gap-2 font-semibold">{t.nome} {t.id === proximoId && <Selo tom="marca">Próximo</Selo>}</p>
                  {t.foco && <p className="text-sm text-texto-suave">{t.foco}</p>}
                  <p className="mt-1 text-xs text-texto-suave">{total} exercício{total === 1 ? "" : "s"}{ultimaVez && ` · última vez ${dataBR(ultimaVez)}`}</p>
                  <button className={`${t.id === proximoId ? "botao" : "botao-secundario"} mt-3 w-full`}>
                    <PlayCircle className="size-4" /> {aberta?.treino_id === t.id ? "Continuar" : "Começar aula"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
