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
