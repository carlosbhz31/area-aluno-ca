// Semana do ciclo: o ciclo tem N semanas (8 por padrão) a partir do início.
// Dias de pausa não contam; enquanto o ciclo está pausado, a semana fica congelada.

export type CicloBase = {
  inicio: string; // AAAA-MM-DD
  semanas: number;
  dias_pausados: number;
  pausado_desde: string | null;
};

export type SituacaoCiclo =
  | { tipo: "sem_ciclo" }
  | { tipo: "nao_iniciado"; diasParaComecar: number }
  | { tipo: "em_andamento"; semana: number; total: number; diaDaSemana: number; progresso: number; pausado: boolean }
  | { tipo: "encerrado"; total: number };

const DIA_MS = 86_400_000;

function paraDia(iso: string): number {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, d) / DIA_MS;
}

/** Data de hoje em Belo Horizonte (AAAA-MM-DD). */
export function hojeEmBH(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

export function situacaoDoCiclo(ciclo: CicloBase | null | undefined, hoje: string = hojeEmBH()): SituacaoCiclo {
  if (!ciclo) return { tipo: "sem_ciclo" };

  const total = ciclo.semanas || 8;
  const referencia = ciclo.pausado_desde && ciclo.pausado_desde < hoje ? ciclo.pausado_desde : hoje;
  const dias = paraDia(referencia) - paraDia(ciclo.inicio) - (ciclo.dias_pausados || 0);

  if (dias < 0) return { tipo: "nao_iniciado", diasParaComecar: -dias };
  if (dias >= total * 7) return { tipo: "encerrado", total };

  const semana = Math.floor(dias / 7) + 1;
  return {
    tipo: "em_andamento",
    semana,
    total,
    diaDaSemana: (dias % 7) + 1,
    progresso: (dias + 1) / (total * 7),
    pausado: Boolean(ciclo.pausado_desde),
  };
}

/** Semana 7 em diante: hora de preparar a reavaliação. */
export function emRetaFinal(s: SituacaoCiclo): boolean {
  return s.tipo === "em_andamento" && s.semana >= s.total - 1;
}
