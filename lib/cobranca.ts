// Cobranças: contas das parcelas e da calculadora de aulas do personal.

export type CalculoAulas = { aulas: number; valor_aula: number; aulas_ferias: number; pct_ferias: number; ajuste: number };

/** Aulas × valor + aulas de férias com desconto (paga só a % combinada) + ajuste (pode ser negativo). */
export function totalAulas(c: CalculoAulas) {
  const normal = c.aulas * c.valor_aula;
  const ferias = c.aulas_ferias * c.valor_aula * (c.pct_ferias / 100);
  return Math.round((normal + ferias + c.ajuste) * 100) / 100;
}

/** Texto curto do cálculo: "12 aulas × R$ 120 + 4 de férias a 30% − R$ 50". */
export function textoCalculo(c: CalculoAulas, moeda: (n: number) => string) {
  const partes = [`${c.aulas} aula${c.aulas === 1 ? "" : "s"} × ${moeda(c.valor_aula)}`];
  if (c.aulas_ferias) partes.push(`${c.aulas_ferias} de férias a ${c.pct_ferias}%`);
  if (c.ajuste) partes.push(`${c.ajuste > 0 ? "ajuste +" : "ajuste −"}${moeda(Math.abs(c.ajuste))}`);
  return partes.join(" + ").replace("+ ajuste −", "− ajuste ");
}

/** Mesmo dia nos meses seguintes (dia 31 vira o último dia do mês curto). */
export function somarMeses(iso: string, meses: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
}
