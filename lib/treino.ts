// Treino: prescrição por semana do ciclo, plano do dia e o que vem depois de cada série.

export type Metrica = "reps" | "segundos";

export const GRUPOS = ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Antebraço", "Quadríceps", "Posteriores", "Glúteos", "Adutores", "Panturrilha", "Abdômen", "Lombar", "Mobilidade", "Cardio", "Outros"];

/** "Bíceps e antebraços", "Triceps", "Glúteo " → nome da lista GRUPOS. */
export function grupoPadrao(v: string | null | undefined): string | null {
  const s = (v ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!s) return null;
  const regras: [RegExp, string][] = [
    [/^peit/, "Peito"], [/^costa/, "Costas"], [/^ombro/, "Ombros"], [/^bicep/, "Bíceps"], [/^tricep/, "Tríceps"], [/^antebra/, "Antebraço"],
    [/^quadri/, "Quadríceps"], [/^posterior/, "Posteriores"], [/^glut/, "Glúteos"], [/^adut/, "Adutores"], [/^panturr/, "Panturrilha"],
    [/^abdo/, "Abdômen"], [/^lomb/, "Lombar"], [/^mobil/, "Mobilidade"], [/^cardio/, "Cardio"],
  ];
  return regras.find(([r]) => r.test(s))?.[1] ?? "Outros";
}
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
  /** Faz junto com o exercício seguinte (superset). Planos antigos não têm o campo. */
  superset?: boolean;
  exercicio_id?: string | null;
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

/** Blocos de exercícios: cada um sozinho, ou os ligados por superset juntos. */
export function blocos<T extends { superset?: boolean }>(lista: T[]): T[][] {
  const r: T[][] = [];
  lista.forEach((e, i) => (i > 0 && lista[i - 1].superset ? r[r.length - 1].push(e) : r.push([e])));
  return r;
}

/** Todas as séries do plano, na ordem em que o aluno faz (aquecimento antes das válidas;
 *  no superset as séries se alternam: A1, B1, A2, B2...). */
export function seriesDoPlano(plano: ExercicioPlano[]): SerieChave[] {
  return blocos(plano).flatMap((bloco) => {
    const aquec = bloco.flatMap((e) => Array.from({ length: e.aquecimento }, (_, i) => ({ exercicioId: e.id, numero: i + 1, aquecimento: true })));
    const maior = Math.max(...bloco.map((e) => e.series));
    const validas = Array.from({ length: maior }, (_, i) => bloco.filter((e) => i < e.series).map((e) => ({ exercicioId: e.id, numero: i + 1, aquecimento: false }))).flat();
    return [...aquec, ...validas];
  });
}

/** Pausa depois da série: nenhuma no aquecimento nem entre exercícios do mesmo superset. */
export function pausaDepois(plano: ExercicioPlano[], s: SerieChave, prox: SerieChave | null) {
  const e = plano.find((x) => x.id === s.exercicioId);
  if (!e || s.aquecimento || !prox) return 0;
  const bloco = blocos(plano).find((b) => b.some((x) => x.id === e.id)) ?? [];
  const ultimoQueTemEssaSerie = [...bloco].reverse().find((x) => s.numero <= x.series);
  if (bloco.length > 1 && ultimoQueTemEssaSerie?.id !== e.id && bloco.some((x) => x.id === prox.exercicioId)) return 0;
  return ultimoQueTemEssaSerie?.pausa ?? e.pausa;
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

/** Id do vídeo do YouTube (watch?v=, youtu.be/, shorts/, embed/, live/). null se não for do YouTube. */
export function videoYoutube(url: string | null | undefined): { id: string; vertical: boolean } | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^(www\.|m\.)/, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com")
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)?.[1] ?? null;
    return id && /^[\w-]{6,20}$/.test(id) ? { id, vertical: u.pathname.startsWith("/shorts/") } : null;
  } catch {
    return null;
  }
}

/** Converte "36,25" em 36.25; vazio ou inválido vira null. */
export function numero(v: string | number | null | undefined, max = 999): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 100) / 100 : null;
}
