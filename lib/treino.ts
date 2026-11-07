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

/** Chave para comparar nomes de exercício: "Leg press 45°" e "Leg Press 45" ficam iguais. */
export function chaveExercicio(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[°º()|-]/g, " ")
    .split(/\s+/)
    .filter((p) => p && !["com", "na", "no", "de", "da", "do", "a", "o", "e", "em"].includes(p))
    .join(" ");
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

/** Unidade da carga: depende do aparelho (anilha em kg, máquina importada em lb, máquina em "barras" / placas). */
export type Unidade = "kg" | "lb" | "barras";
export const UNIDADES: Unidade[] = ["kg", "lb", "barras"];
export const unidadeValida = (u: unknown): Unidade => (UNIDADES.includes(u as Unidade) ? (u as Unidade) : "kg");
/** "92,5 kg", "40 lb", "6 barras". */
export const comUnidade = (n: number, u?: string | null) => `${String(Math.round(n * 100) / 100).replace(".", ",")} ${unidadeValida(u)}`;

export type SerieAnterior = { numero: number; carga: number | null; reps: number | null; segundos: number | null; unidade?: string | null };
export type UltimaVez = { data: string; execucaoId: string; series: SerieAnterior[]; porSerie: Record<number, SerieAnterior> };

/** Séries de treinos anteriores (mais recentes primeiro) → por exercício: o último treino inteiro
 *  e, para cada número de série, a última vez que ela foi feita (a 4ª série pode vir de um treino mais antigo). */
export function montarUltimaVez(linhas: (SerieAnterior & { execucao_id: string; exercicio_id: string; feita_em: string })[]) {
  const ultimaVez: Record<string, UltimaVez> = {};
  for (const r of linhas) {
    const s = { numero: r.numero, carga: r.carga, reps: r.reps, segundos: r.segundos, unidade: r.unidade ?? "kg" };
    const u = (ultimaVez[r.exercicio_id] ??= { data: r.feita_em, execucaoId: r.execucao_id, series: [], porSerie: {} });
    if (u.execucaoId === r.execucao_id) u.series.push(s);
    u.porSerie[r.numero] ??= s;
  }
  for (const u of Object.values(ultimaVez)) u.series.sort((a, b) => a.numero - b.numero);
  return ultimaVez;
}

export type ItemRelatorio = {
  id: string;
  nome: string;
  /** Comparando a melhor série de hoje com a da última vez. */
  evolucao: "carga" | "reps" | "volume" | "igual" | "menos" | "novo";
  texto: string;
  recorde: boolean;
  /** Quanto falta para o topo da faixa da semana (ou que já bateu). */
  meta: string | null;
};

type LinhaSerie = SerieAnterior & { execucao_id: string; exercicio_id: string; feita_em: string };

/** Relatório do fim do treino: o que evoluiu em relação à última vez de cada exercício.
 *  `hoje` são as séries válidas deste treino; `antes`, as de treinos anteriores (mais recentes primeiro). */
export function relatorioTreino(plano: ExercicioPlano[], hoje: (SerieAnterior & { exercicio_id: string })[], antes: LinhaSerie[]) {
  const ultima = montarUltimaVez(antes);
  const itens: ItemRelatorio[] = [];
  let volume = 0;
  for (const e of plano) {
    const h = hoje.filter((s) => s.exercicio_id === e.id);
    if (!h.length) continue;
    const seg = e.metrica === "segundos";
    const qtd = (s: SerieAnterior) => (seg ? s.segundos : s.reps) ?? 0;
    const un = seg ? "s" : "reps";
    const melhor = (l: SerieAnterior[]) => [...l].sort((a, b) => (b.carga ?? 0) - (a.carga ?? 0) || qtd(b) - qtd(a))[0];
    const vol = (l: SerieAnterior[]) => l.reduce((t, s) => t + (s.carga ? s.carga * qtd(s) : qtd(s)), 0);
    if (!seg) volume += h.reduce((t, s) => t + (s.carga ?? 0) * qtd(s), 0);

    const hb = melhor(h);
    const ant = ultima[e.id]?.series ?? [];
    const ab = melhor(ant);
    let evolucao: ItemRelatorio["evolucao"];
    let texto: string;
    const kg = (n: number) => comUnidade(n, hb.unidade);
    if (!ab) [evolucao, texto] = ["novo", "Primeira vez registrada. Agora é bater esse número."];
    else if ((hb.carga ?? 0) > (ab.carga ?? 0)) [evolucao, texto] = ["carga", `+${kg((hb.carga ?? 0) - (ab.carga ?? 0))} (${kg(ab.carga ?? 0)} → ${kg(hb.carga ?? 0)})`];
    else if ((hb.carga ?? 0) === (ab.carga ?? 0) && qtd(hb) > qtd(ab)) [evolucao, texto] = ["reps", `+${qtd(hb) - qtd(ab)} ${un} com ${hb.carga ? kg(hb.carga) : "o mesmo peso"}`];
    else if (vol(h) > vol(ant)) [evolucao, texto] = ["volume", seg ? "Mais tempo no total que a última vez" : "Mais volume no total, somando todas as séries"];
    else if (vol(h) === vol(ant) || (hb.carga === ab.carga && qtd(hb) === qtd(ab))) [evolucao, texto] = ["igual", "Manteve o da última vez"];
    else [evolucao, texto] = ["menos", "Abaixo da última vez. Acontece: descansa bem e vem pra cima"];

    const recordeAntes = Math.max(0, ...antes.filter((s) => s.exercicio_id === e.id).map((s) => s.carga ?? 0));
    const recorde = Boolean(ab) && (hb.carga ?? 0) > recordeAntes && recordeAntes > 0;

    let meta: string | null = null;
    if (e.max) {
      const menor = Math.min(...h.map(qtd));
      if (h.length >= e.series && menor >= e.max) meta = `Topo da faixa (${e.max} ${un}) em todas as séries: na próxima, sobe a carga`;
      else if (menor < e.max) meta = `Faltam ${e.max - menor} ${un} na série mais fraca para o topo da faixa (${e.max})`;
    }
    itens.push({ id: e.id, nome: e.nome, evolucao, texto, recorde, meta });
  }
  const evoluiu = itens.filter((i) => ["carga", "reps", "volume"].includes(i.evolucao)).length;
  return { itens, evoluiu, volume: Math.round(volume) };
}

/** Esforço do fim do treino em 4 carinhas. Guarda um número de 1 a 10 (o banco e os treinos antigos usam essa escala). */
export const ESFORCOS = [
  { valor: 3, emoji: "😌", rotulo: "Leve" },
  { valor: 5, emoji: "🙂", rotulo: "Moderado" },
  { valor: 8, emoji: "😮‍💨", rotulo: "Difícil" },
  { valor: 10, emoji: "🥵", rotulo: "No limite" },
] as const;

/** Número de 1 a 10 (inclusive dos treinos antigos) → a carinha mais próxima. */
export function esforcoDe(n: number | null | undefined) {
  if (!n) return null;
  return n <= 3 ? ESFORCOS[0] : n <= 6 ? ESFORCOS[1] : n <= 8 ? ESFORCOS[2] : ESFORCOS[3];
}

/** Chave da anotação de um exercício: o exercício da lista (vale em todos os ciclos) ou o nome. */
export const chaveAnotacao = (e: { exercicio_id?: string | null; nome: string }) => e.exercicio_id || `nome:${chaveExercicio(e.nome)}`;
export type Anotacao = { texto: string; por: "aluno" | "professor"; em: string };

/** Anotações de um aluno por exercício: chaveAnotacao → anotação. */
export async function lerAnotacoes(supabase: import("@supabase/supabase-js").SupabaseClient, alunoId: string): Promise<Record<string, Anotacao>> {
  const { data } = await supabase.from("anotacoes_exercicio").select("chave, texto, atualizado_por, atualizado_em").eq("aluno_id", alunoId).neq("texto", "");
  return Object.fromEntries((data ?? []).map((a) => [a.chave, { texto: a.texto, por: a.atualizado_por, em: a.atualizado_em }]));
}

/** Cardio do programa: sessões fixas da semana (ex.: "Quarta · corrida de qualidade"), cada uma com o
 *  texto de cada semana do ciclo. Semana sem texto (ou "-") = não tem essa sessão naquela semana. */
export type SessaoCardio = { nome: string; semanas: string[] };
export type Cardio = { orientacoes: string | null; sessoes: SessaoCardio[] };

/** O que fazer em cada sessão numa semana do ciclo (sem ciclo = semana 1; depois da última, repete a última). */
export function cardioDaSemana(c: Cardio | null | undefined, semana: number | null) {
  if (!c?.sessoes?.length) return [];
  return c.sessoes
    .map((s, i) => {
      const n = s.semanas.length ? Math.min(Math.max(semana ?? 1, 1), s.semanas.length) : 0;
      const texto = (s.semanas[n - 1] ?? "").trim();
      return { indice: i, nome: s.nome, texto };
    })
    .filter((s) => s.texto && s.texto !== "-");
}
