// Treino: prescrição por semana do ciclo, plano do dia e o que vem depois de cada série.

export type Metrica = "reps" | "segundos";
export type SemanaPrescrita = { series: number; min: number; max: number; pausa: number };

export type ExercicioFicha = {
  id: string;
  ordem: number;
  nome: string;
  grupo: string | null;
  equipamento: string | null;
  video_url: string | null;
  observacoes: string | null;
  metrica: Metrica;
  aquecimento: number;
  prescricao: SemanaPrescrita[];
};

/** Exercício como fica gravado na execução: a prescrição já é a da semana do treino. */
export type ExercicioPlano = Omit<ExercicioFicha, "prescricao" | "ordem"> & SemanaPrescrita;

export type SerieChave = { exercicioId: string; numero: number; aquecimento: boolean };

/** Prescrição da semana: uma só vale para o ciclo todo; depois da última, repete a última. */
export function prescricaoDaSemana(prescricao: SemanaPrescrita[], semana: number | null): SemanaPrescrita {
  if (prescricao.length === 1 || !semana || semana < 1) return prescricao[0];
  return prescricao[Math.min(semana, prescricao.length) - 1];
}

export function planoDoDia(exercicios: ExercicioFicha[], semana: number | null): ExercicioPlano[] {
  return [...exercicios]
    .sort((a, b) => a.ordem - b.ordem)
    .map(({ prescricao, ordem: _ordem, ...e }) => ({ ...e, ...prescricaoDaSemana(prescricao, semana) }));
}

/** "10–12", "12" ou "30 s". */
export function alvo(e: Pick<SemanaPrescrita, "min" | "max"> & { metrica: Metrica }) {
  const faixa = e.min === e.max || !e.max ? `${e.min}` : `${e.min}–${e.max}`;
  return e.metrica === "segundos" ? `${faixa} s` : faixa;
}

export function tempo(segundos: number) {
  const s = Math.max(0, Math.round(segundos));
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s} s`;
}

export const chaveSerie = (c: SerieChave) => `${c.exercicioId}:${c.aquecimento ? "a" : "v"}:${c.numero}`;

/** Todas as séries do plano, na ordem em que o aluno faz (aquecimento antes das válidas). */
export function seriesDoPlano(plano: ExercicioPlano[]): SerieChave[] {
  return plano.flatMap((e) => [
    ...Array.from({ length: e.aquecimento }, (_, i) => ({ exercicioId: e.id, numero: i + 1, aquecimento: true })),
    ...Array.from({ length: e.series }, (_, i) => ({ exercicioId: e.id, numero: i + 1, aquecimento: false })),
  ]);
}

/** Próxima série ainda não feita depois da que acabou de ser marcada (ou a primeira que faltou). */
export function proximaSerie(plano: ExercicioPlano[], feitas: Set<string>, depoisDe: SerieChave): SerieChave | null {
  const todas = seriesDoPlano(plano);
  const i = todas.findIndex((s) => chaveSerie(s) === chaveSerie(depoisDe));
  return [...todas.slice(i + 1), ...todas.slice(0, Math.max(0, i))].find((s) => !feitas.has(chaveSerie(s))) ?? null;
}

/** Aviso do fim da pausa: diz o que vem agora. */
export function textoProxima(plano: ExercicioPlano[], s: SerieChave | null) {
  if (!s) return "Bora para a última parte!";
  const e = plano.find((x) => x.id === s.exercicioId);
  if (!e) return "Bora para a próxima série.";
  const qual = s.aquecimento ? `aquecimento ${s.numero}` : `série ${s.numero} de ${e.series}`;
  return `${e.nome}: ${qual} (${alvo(e)}${e.metrica === "reps" ? " reps" : ""})`;
}

/** Converte "36,25" em 36.25; vazio ou inválido vira null. */
export function numero(v: string | number | null | undefined, max = 999): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 100) / 100 : null;
}
