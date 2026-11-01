import "server-only";
import { clienteAdmin } from "./supabase/servidor";
import { ligaPorPontos } from "./ligas";
import { avisarAluno } from "./notificar";
import type { FaixaLiga } from "./tipos";
import type { Respostas } from "./acompanhamento";

// Pontos vêm do que o aluno controla. Tudo roda no servidor com a chave de serviço:
// o aluno não consegue gravar pontos nem conquistas (as regras do banco bloqueiam).

export const REGRAS_PADRAO = {
  acompanhamento_no_prazo: 5,
  semana_100_treinos: 5,
  registro_peso_medidas: 2,
  fotos_fim_ciclo: 5,
  anamnese_concluida: 5,
  recorde_carga: 3,
  acompanhamento_atrasado_3_dias: -1,
};
export type Regras = typeof REGRAS_PADRAO;

export const NOME_ACAO_PONTOS: Record<keyof Regras, string> = {
  acompanhamento_no_prazo: "Acompanhamento no prazo",
  semana_100_treinos: "100% dos treinos da semana",
  registro_peso_medidas: "Peso ou medidas na semana",
  fotos_fim_ciclo: "Fotos do fim do ciclo",
  anamnese_concluida: "Anamnese concluída",
  recorde_carga: "Recorde de carga",
  acompanhamento_atrasado_3_dias: "Acompanhamento com mais de 3 dias de atraso",
};

async function configuracao() {
  const { data } = await clienteAdmin().from("configuracoes").select("chave, valor").in("chave", ["regras_pontos", "faixas_ligas"]);
  const m = Object.fromEntries((data ?? []).map((c) => [c.chave, c.valor]));
  return { regras: { ...REGRAS_PADRAO, ...((m.regras_pontos as Partial<Regras>) ?? {}) }, faixas: (m.faixas_ligas as FaixaLiga[] | undefined) ?? undefined };
}

async function totalPontos(alunoId: string) {
  const { data } = await clienteAdmin().from("pontuacoes").select("pontos").eq("aluno_id", alunoId);
  return (data ?? []).reduce((s, p) => s + p.pontos, 0);
}

/** Lança pontos uma vez só por (ação, referência). */
async function pontuar(alunoId: string, acao: keyof Regras, pontos: number, referencia: string) {
  if (!pontos) return false;
  const { error } = await clienteAdmin().from("pontuacoes").insert({ aluno_id: alunoId, acao, pontos, referencia });
  return !error;
}

/** Desbloqueia um broche (para sempre) e avisa o aluno. */
export async function conquistar(alunoId: string, broche: string) {
  const admin = clienteAdmin();
  const { error } = await admin.from("conquistas").insert({ aluno_id: alunoId, broche });
  if (error) return false; // já tinha
  const { data: b } = await admin.from("broches").select("nome").eq("codigo", broche).maybeSingle();
  await avisarAluno(alunoId, { tipo: "conquista", titulo: "Conquista desbloqueada", corpo: b?.nome ?? "Nova conquista", url: "/conquistas", referencia: broche });
  return true;
}

/** Roda uma premiação e avisa se o aluno subiu de liga. */
async function comLiga(alunoId: string, premiar: (regras: Regras) => Promise<void>) {
  const { regras, faixas } = await configuracao();
  const antes = ligaPorPontos(await totalPontos(alunoId), faixas).liga;
  await premiar(regras);
  const depois = ligaPorPontos(await totalPontos(alunoId), faixas).liga;
  if (depois !== antes) {
    await avisarAluno(alunoId, { tipo: "liga", titulo: `Você subiu para a liga ${depois}`, corpo: "Constância dá resultado. Segue assim.", url: "/conquistas", referencia: depois });
  }
}

export async function premiarAcompanhamento(
  alunoId: string,
  a: { id: string; ciclo_id: string | null; semana: number | null; respostas: Respostas },
  prazo: { diasAtraso: number; semanasDoCiclo: number } | null,
) {
  await comLiga(alunoId, async (regras) => {
    if (prazo) {
      if (prazo.diasAtraso <= 1) await pontuar(alunoId, "acompanhamento_no_prazo", regras.acompanhamento_no_prazo, a.id);
      else if (prazo.diasAtraso > 3) await pontuar(alunoId, "acompanhamento_atrasado_3_dias", regras.acompanhamento_atrasado_3_dias, a.id);
    }
    const r = a.respostas;
    const perfeita = !!r.treinos_planejados && (r.treinos_feitos ?? 0) >= r.treinos_planejados;
    if (perfeita) await pontuar(alunoId, "semana_100_treinos", regras.semana_100_treinos, a.id);
    if (r.recorde) await pontuar(alunoId, "recorde_carga", regras.recorde_carga, a.id);

    await conquistar(alunoId, "primeiro_checkin");
    if (perfeita) await conquistar(alunoId, "semana_perfeita");
    if (r.recorde) await conquistar(alunoId, "recorde_carga");

    if (a.ciclo_id && a.semana) {
      const { data: doCiclo } = await clienteAdmin().from("acompanhamentos").select("semana").eq("ciclo_id", a.ciclo_id);
      const semanas = new Set((doCiclo ?? []).map((x) => x.semana));
      if ([0, 1, 2, 3].every((k) => semanas.has(a.semana! - k))) await conquistar(alunoId, "quatro_semanas");
      if (prazo && a.semana >= prazo.semanasDoCiclo) {
        await conquistar(alunoId, "ciclo_completo");
        // Ciclos fechados = ciclos com o acompanhamento da última semana
        const { data: ciclos } = await clienteAdmin().from("ciclos").select("id, semanas").eq("aluno_id", alunoId);
        const { data: finais } = await clienteAdmin().from("acompanhamentos").select("ciclo_id, semana").eq("aluno_id", alunoId);
        const fechados = (ciclos ?? []).filter((c) => (finais ?? []).some((f) => f.ciclo_id === c.id && (f.semana ?? 0) >= c.semanas)).length;
        if (fechados >= 3) await conquistar(alunoId, "tres_ciclos");
      }
    }
  });
}

/** Semana ISO (ex.: 2026-W45) para pontuar peso/medidas uma vez por semana. */
function semanaIso(data: string) {
  const d = new Date(data.slice(0, 10) + "T12:00:00Z");
  const dia = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dia + 3);
  const primeira = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const n = 1 + Math.round(((d.getTime() - primeira.getTime()) / 86_400_000 - 3 + ((primeira.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(n).padStart(2, "0")}`;
}

export async function premiarEvolucao(
  alunoId: string,
  reg: { data: string; peso: number | null; medidas: object | null; temFotos: boolean },
  ciclo: { id: string; fimDeCiclo: boolean } | null,
) {
  await comLiga(alunoId, async (regras) => {
    if (reg.peso || reg.medidas) await pontuar(alunoId, "registro_peso_medidas", regras.registro_peso_medidas, semanaIso(reg.data));
    if (reg.peso) await conquistar(alunoId, "primeiro_peso");
    if (reg.temFotos && ciclo?.fimDeCiclo) {
      await pontuar(alunoId, "fotos_fim_ciclo", regras.fotos_fim_ciclo, ciclo.id);
      await conquistar(alunoId, "fotos_ciclo");
    }
  });
}

/** Broches de tempo de casa (checado ao abrir o Início). */
export async function conquistasDeTempo(aluno: { id: string; inicio: string | null }) {
  if (!aluno.inicio) return;
  const dias = (Date.now() - Date.parse(aluno.inicio)) / 86_400_000;
  if (dias >= 182) await conquistar(aluno.id, "seis_meses");
  if (dias >= 365) await conquistar(aluno.id, "um_ano");
}
