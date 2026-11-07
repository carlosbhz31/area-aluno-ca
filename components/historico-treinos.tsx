import type { SupabaseClient } from "@supabase/supabase-js";
import { Dumbbell, History, MessageSquareText, TrendingUp } from "lucide-react";
import { dataBR } from "@/lib/formato";
import { chaveAnotacao, comUnidade, esforcoDe, unidadeValida, type ExercicioPlano } from "@/lib/treino";
import { GraficoCarga, type SerieGrafico } from "./grafico-carga";
import { Cartao, TituloCartao, Vazio } from "./ui";

type Serie = { exercicio_id: string; numero: number; aquecimento: boolean; carga: number | null; reps: number | null; segundos: number | null; unidade: string | null };
type Execucao = {
  id: string;
  nome_treino: string;
  semana: number | null;
  plano: ExercicioPlano[];
  iniciada_em: string;
  concluida_em: string;
  esforco: number | null;
  comentario: string | null;
  series_feitas: Serie[];
};


/** Histórico de treinos do aluno: gráfico da carga por exercício e a lista dos treinos feitos.
 *  O mesmo exercício em ciclos diferentes é juntado pelo exercício da lista (ou pelo nome). */
export async function HistoricoTreinos({ supabase, alunoId }: { supabase: SupabaseClient; alunoId: string }) {
  const { data } = await supabase
    .from("execucoes")
    .select("id, nome_treino, semana, plano, iniciada_em, concluida_em, esforco, comentario, series_feitas(exercicio_id, numero, aquecimento, carga, reps, segundos, unidade)")
    .eq("aluno_id", alunoId)
    .not("concluida_em", "is", null)
    .order("iniciada_em", { ascending: false })
    .limit(150);
  const execucoes = (data ?? []) as Execucao[];

  if (!execucoes.length) {
    return (
      <Cartao>
        <Vazio icone={Dumbbell} titulo="Nenhum treino registrado ainda">Cada treino concluído aparece aqui, com a carga de cada exercício e o gráfico da sua evolução.</Vazio>
      </Cartao>
    );
  }

  // Carga por exercício: a série mais pesada de cada treino
  const grupos = new Map<string, SerieGrafico>();
  for (const ex of [...execucoes].reverse()) {
    for (const e of ex.plano) {
      const validas = ex.series_feitas.filter((s) => s.exercicio_id === e.id && !s.aquecimento && s.carga != null);
      if (!validas.length) continue;
      const melhor = validas.reduce((a, b) => ((b.carga ?? 0) > (a.carga ?? 0) ? b : a));
      const chave = chaveAnotacao(e);
      const g = grupos.get(chave) ?? { chave, nome: e.nome, unidade: unidadeValida(melhor.unidade), pontos: [] };
      g.nome = e.nome; // fica o nome mais recente
      g.unidade = unidadeValida(melhor.unidade);
      g.pontos.push({ data: ex.iniciada_em.slice(0, 10), peso: Number(melhor.carga) });
      grupos.set(chave, g);
    }
  }
  const series = [...grupos.values()].sort((a, b) => b.pontos.length - a.pontos.length || a.nome.localeCompare(b.nome));

  return (
    <div className="space-y-4">
      {series.length > 0 && (
        <Cartao>
          <TituloCartao icone={TrendingUp}>Carga por exercício</TituloCartao>
          <GraficoCarga series={series} />
        </Cartao>
      )}

      <Cartao>
        <TituloCartao icone={History}>Treinos feitos ({execucoes.length})</TituloCartao>
        <ul className="space-y-2">
          {execucoes.map((ex) => {
            const validas = ex.series_feitas.filter((s) => !s.aquecimento);
            const minutos = Math.round((Date.parse(ex.concluida_em) - Date.parse(ex.iniciada_em)) / 60000);
            const esf = esforcoDe(ex.esforco);
            return (
              <li key={ex.id}>
                <details className="rounded-xl border border-borda">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-0.5 p-3 text-sm">
                    <span className="font-semibold">{dataBR(ex.iniciada_em.slice(0, 10))}</span>
                    <span className="min-w-0 flex-1 truncate">{ex.nome_treino}</span>
                    <span className="w-full text-xs text-texto-suave">
                      {ex.semana ? `semana ${ex.semana} · ` : ""}
                      {validas.length} séries{minutos > 0 && minutos < 600 ? ` · ${minutos} min` : ""}
                      {esf ? ` · ${esf.emoji} ${esf.rotulo}` : ""}
                    </span>
                  </summary>
                  <div className="space-y-1.5 border-t border-borda p-3 text-sm">
                    {ex.comentario && (
                      <p className="flex gap-1.5 rounded-lg bg-marca-suave p-2 text-marca"><MessageSquareText className="mt-0.5 size-4 shrink-0" /> {ex.comentario}</p>
                    )}
                    {ex.plano.map((e) => {
                      const feitas = validas.filter((s) => s.exercicio_id === e.id).sort((a, b) => a.numero - b.numero);
                      if (!feitas.length) return null;
                      return (
                        <p key={e.id}>
                          <span className="font-medium">{e.nome}: </span>
                          <span className="text-texto-suave">
                            {feitas.map((s) => `${s.carga != null ? `${comUnidade(s.carga, s.unidade)} × ` : ""}${e.metrica === "segundos" ? `${s.segundos ?? "-"} s` : s.reps ?? "-"}`).join(" · ")}
                          </span>
                        </p>
                      );
                    })}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </Cartao>
    </div>
  );
}

