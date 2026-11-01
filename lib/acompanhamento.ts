// Regras do acompanhamento semanal: um envio por semana do ciclo, no dia combinado.

import { hojeEmBH, situacaoDoCiclo, type CicloBase } from "./ciclo";

const DIA_MS = 86_400_000;
const paraDia = (iso: string) => Date.parse(iso.slice(0, 10) + "T00:00:00Z") / DIA_MS;
const paraIso = (dia: number) => new Date(dia * DIA_MS).toISOString().slice(0, 10);

export type PrazoSemana =
  | { tipo: "sem_ciclo" }
  | { tipo: "fora_do_ciclo" }
  | { tipo: "ativo"; semana: number; vence: string; diasAtraso: number; ehHoje: boolean; pausado: boolean };

/** Dia de vencimento do acompanhamento na semana atual do ciclo e quantos dias de atraso. */
export function prazoDaSemana(ciclo: CicloBase | null, diaCombinado: number, hoje: string = hojeEmBH()): PrazoSemana {
  const s = situacaoDoCiclo(ciclo, hoje);
  if (s.tipo === "sem_ciclo") return { tipo: "sem_ciclo" };
  if (s.tipo !== "em_andamento") return { tipo: "fora_do_ciclo" };

  const inicioSemana = paraDia(hoje) - (s.diaDaSemana - 1);
  let vence = inicioSemana;
  while (new Date(vence * DIA_MS).getUTCDay() !== diaCombinado) vence++;
  const atraso = paraDia(hoje) - vence;
  return { tipo: "ativo", semana: s.semana, vence: paraIso(vence), diasAtraso: Math.max(0, atraso), ehHoje: atraso === 0, pausado: s.pausado };
}

export type Respostas = {
  treinos_planejados: number | null;
  treinos_feitos: number | null;
  aderencia: number | null; // 1 a 5
  cardio_vezes: number | null;
  dor: boolean;
  dor_onde: string | null;
  sono: number | null; // 1 a 5
  energia: number | null; // 1 a 5
  recorde: string | null;
  duvidas: string | null;
};

export const ESCALA: Record<number, string> = { 1: "Muito ruim", 2: "Ruim", 3: "Ok", 4: "Bom", 5: "Muito bom" };

/** Pontos que chamam a atenção do professor na leitura rápida. */
export function sinaisDeAlerta(r: Partial<Respostas>): string[] {
  const sinais: string[] = [];
  if (r.dor) sinais.push(r.dor_onde ? `Dor: ${r.dor_onde}` : "Relatou dor");
  if (r.treinos_planejados && r.treinos_feitos != null && r.treinos_feitos < r.treinos_planejados / 2) sinais.push("Menos da metade dos treinos");
  if (r.sono != null && r.sono <= 2) sinais.push("Sono ruim");
  if (r.energia != null && r.energia <= 2) sinais.push("Energia baixa");
  if (r.aderencia != null && r.aderencia <= 2) sinais.push("Aderência baixa");
  return sinais;
}
