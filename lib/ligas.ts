import type { FaixaLiga } from "./tipos";

export const FAIXAS_PADRAO: FaixaLiga[] = [
  { liga: "Ferro", min: 0 },
  { liga: "Bronze", min: 30 },
  { liga: "Prata", min: 80 },
  { liga: "Ouro", min: 150 },
  { liga: "Platina", min: 250 },
  { liga: "Diamante", min: 400 },
  { liga: "Mestre", min: 600 },
];

/** Quem subiu fica protegido até o fim da semana: a liga usa o maior entre os pontos de agora
 *  e os do começo da semana. "Faltam" sempre conta a partir dos pontos de agora. */
export function ligaProtegida(agora: number, inicioDaSemana: number, faixas: FaixaLiga[] = FAIXAS_PADRAO) {
  const base = ligaPorPontos(Math.max(agora, inicioDaSemana), faixas);
  const proxima = [...faixas].sort((a, b) => a.min - b.min).find((f) => f.liga === base.proxima);
  return { ...base, faltam: proxima ? Math.max(0, proxima.min - agora) : 0 };
}

/** Liga atual e quanto falta para a próxima. */
export function ligaPorPontos(pontos: number, faixas: FaixaLiga[] = FAIXAS_PADRAO) {
  const ordenadas = [...faixas].sort((a, b) => a.min - b.min);
  let i = 0;
  while (i + 1 < ordenadas.length && pontos >= ordenadas[i + 1].min) i++;
  const atual = ordenadas[i];
  const proxima = ordenadas[i + 1] ?? null;
  const progresso = proxima ? (pontos - atual.min) / (proxima.min - atual.min) : 1;
  return { liga: atual.liga, proxima: proxima?.liga ?? null, faltam: proxima ? proxima.min - pontos : 0, progresso };
}
