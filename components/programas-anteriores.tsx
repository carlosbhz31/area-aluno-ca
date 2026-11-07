import type { SupabaseClient } from "@supabase/supabase-js";
import { Archive, CheckCircle2 } from "lucide-react";
import { dataBR } from "@/lib/formato";
import { alvo, comUnidade, prescricaoDaSemana, type SemanaPrescrita } from "@/lib/treino";
import { Cartao, Selo, TituloCartao } from "./ui";

type Ex = { id: string; nome: string; ordem: number; metrica: "reps" | "segundos"; prescricao: SemanaPrescrita[] };
type Programa = {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
  ciclos: { numero: number; inicio: string; fim: string } | null;
  treinos: { id: string; nome: string; foco: string | null; ordem: number; exercicios_treino: Ex[] }[];
};
type Serie = { exercicio_id: string; carga: number | null; reps: number | null; segundos: number | null; unidade: string | null; feita_em: string };

/** Programas do aluno: o ativo em cima e os anteriores embaixo, cada um com as cargas que ficaram registradas
 *  naquele programa (a melhor e a última de cada exercício). O que vale hoje é sempre o ativo.
 *  `ativar`: só no painel do professor, para trocar qual programa está valendo. */
export async function ProgramasAnteriores({ supabase, alunoId, ativar }: { supabase: SupabaseClient; alunoId: string; ativar?: (programaId: string) => Promise<void> }) {
  const { data } = await supabase
    .from("programas")
    .select("id, nome, ativo, criado_em, ciclos(numero, inicio, fim), treinos(id, nome, foco, ordem, exercicios_treino(id, nome, ordem, metrica, prescricao))")
    .eq("aluno_id", alunoId)
    .order("ativo", { ascending: false })
    .order("criado_em", { ascending: false });
  const programas = (data ?? []) as unknown as Programa[];
  if (programas.length < 2) return null; // só o atual: nada para comparar

  const ids = programas.flatMap((p) => p.treinos.flatMap((t) => t.exercicios_treino.map((e) => e.id)));
  const { data: series } = await supabase
    .from("series_feitas")
    .select("exercicio_id, carga, reps, segundos, unidade, feita_em")
    .eq("aluno_id", alunoId)
    .eq("aquecimento", false)
    .in("exercicio_id", ids)
    .order("feita_em", { ascending: false })
    .limit(3000);
  const porEx = new Map<string, Serie[]>();
  for (const s of (series ?? []) as Serie[]) porEx.set(s.exercicio_id, [...(porEx.get(s.exercicio_id) ?? []), s]);
  const qtd = (s: Serie, e: Ex) => (e.metrica === "segundos" ? `${s.segundos ?? "-"} s` : `${s.reps ?? "-"}`);
  const fmt = (s: Serie, e: Ex) => (s.carga != null ? `${comUnidade(s.carga, s.unidade)} × ${qtd(s, e)}` : qtd(s, e));

  return (
    <Cartao>
      <TituloCartao icone={Archive}>Programas ({programas.length})</TituloCartao>
      <ul className="space-y-2">
        {programas.map((p) => {
          const feitos = p.treinos.reduce((t, x) => t + x.exercicios_treino.filter((e) => porEx.has(e.id)).length, 0);
          return (
            <li key={p.id}>
              <details className={`rounded-xl border ${p.ativo ? "border-marca" : "border-borda"}`} open={false}>
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-sm">
                  <span className="font-semibold">{p.nome}</span>
                  {p.ativo ? <Selo tom="marca">Ativo agora</Selo> : <Selo>Anterior</Selo>}
                  <span className="w-full text-xs text-texto-suave">
                    {p.ciclos ? `Ciclo ${p.ciclos.numero} · ${dataBR(p.ciclos.inicio)} a ${dataBR(p.ciclos.fim)}` : `Criado em ${dataBR(p.criado_em)}`}
                    {` · ${p.treinos.length} treino${p.treinos.length === 1 ? "" : "s"}`}
                    {feitos ? "" : " · nenhuma carga registrada"}
                  </span>
                </summary>
                <div className="space-y-3 border-t border-borda p-3 text-sm">
                  {[...p.treinos].sort((a, b) => a.ordem - b.ordem).map((t) => (
                    <div key={t.id}>
                      <p className="font-semibold">{t.nome}{t.foco ? ` · ${t.foco}` : ""}</p>
                      <ul className="mt-1 space-y-1">
                        {[...t.exercicios_treino].sort((a, b) => a.ordem - b.ordem).map((e) => {
                          const l = porEx.get(e.id) ?? [];
                          const melhor = [...l].sort((a, b) => (b.carga ?? 0) - (a.carga ?? 0))[0];
                          const pres = prescricaoDaSemana(e.prescricao ?? [], null);
                          return (
                            <li key={e.id} className="flex flex-wrap gap-x-2">
                              <span>{e.nome}</span>
                              {pres && <span className="text-texto-suave">{pres.series}×{alvo({ ...pres, metrica: e.metrica })}</span>}
                              {l.length > 0 && (
                                <span className="text-marca">
                                  melhor {fmt(melhor, e)} · última {fmt(l[0], e)} ({dataBR(l[0].feita_em.slice(0, 10)).slice(0, 5)})
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                  {ativar && !p.ativo && (
                    <form action={ativar.bind(null, p.id)}>
                      <button className="botao-secundario !py-1.5 text-sm"><CheckCircle2 className="size-4" /> Voltar a usar este programa</button>
                    </form>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </Cartao>
  );
}
