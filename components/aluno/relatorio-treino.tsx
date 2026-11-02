import { CheckCircle2, Minus, Sparkles, Target, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import type { ItemRelatorio } from "@/lib/treino";

const milhar = (n: number) => n.toLocaleString("pt-BR");

/** Fim do treino: o que o aluno evoluiu em relação à última vez (motivação para o próximo). */
export function RelatorioTreino({ nome, minutos, series, volume, volumeAntes, itens, evoluiu }: {
  nome: string;
  minutos: number | null;
  series: number;
  volume: number;
  /** Volume da última vez deste mesmo treino (para comparar). */
  volumeAntes: number | null;
  itens: ItemRelatorio[];
  evoluiu: number;
}) {
  const recordes = itens.filter((i) => i.recorde).length;
  const comparaveis = itens.filter((i) => i.evolucao !== "novo").length;
  const titulo =
    recordes > 0 ? `${recordes === 1 ? "Novo recorde" : `${recordes} recordes`} hoje! 🏆`
    : evoluiu > 0 ? `Você evoluiu em ${evoluiu} de ${comparaveis} exercício${comparaveis === 1 ? "" : "s"} 💪`
    : comparaveis ? "Treino feito. Constância é o que dá resultado 💪"
    : "Primeiro registro feito! Agora é bater esses números 💪";
  const difVolume = volumeAntes ? Math.round(((volume - volumeAntes) / volumeAntes) * 100) : null;

  return (
    <section className="cartao space-y-4 border-ok/40 p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="size-7 shrink-0 text-ok" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ok">Treino concluído · {nome}</p>
          <h2 className="text-lg font-bold leading-snug">{titulo}</h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-fundo p-2">
          <p className="text-lg font-bold">{minutos != null ? `${minutos} min` : "-"}</p>
          <p className="text-[11px] text-texto-suave">Duração</p>
        </div>
        <div className="rounded-xl bg-fundo p-2">
          <p className="text-lg font-bold">{series}</p>
          <p className="text-[11px] text-texto-suave">Séries</p>
        </div>
        <div className="rounded-xl bg-fundo p-2">
          <p className="text-lg font-bold">{volume ? `${milhar(volume)} kg` : "-"}</p>
          <p className="text-[11px] text-texto-suave">
            {difVolume != null && volume ? (difVolume > 0 ? <span className="font-semibold text-ok">+{difVolume}% que a última</span> : difVolume < 0 ? `${difVolume}% que a última` : "igual à última") : "Levantados"}
          </p>
        </div>
      </div>

      {itens.length > 0 && (
        <ul className="divide-y divide-borda">
          {itens.map((i) => {
            const subiu = ["carga", "reps", "volume"].includes(i.evolucao);
            const Icone = i.recorde ? Trophy : subiu ? TrendingUp : i.evolucao === "novo" ? Sparkles : i.evolucao === "menos" ? TrendingDown : Minus;
            return (
              <li key={i.id} className="flex items-start gap-3 py-2.5">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${i.recorde ? "bg-alerta-suave text-alerta" : subiu ? "bg-ok-suave text-ok" : "bg-fundo text-texto-suave"}`}>
                  <Icone className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">
                    {i.nome} {i.recorde && <span className="ml-1 rounded-full bg-alerta-suave px-2 py-0.5 text-[11px] font-semibold text-alerta">Recorde</span>}
                  </p>
                  <p className={`text-sm ${subiu ? "font-semibold text-ok" : "text-texto-suave"}`}>{i.texto}</p>
                  {i.meta && <p className="mt-0.5 flex items-start gap-1 text-xs text-texto-suave"><Target className="mt-0.5 size-3.5 shrink-0" /> {i.meta}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
