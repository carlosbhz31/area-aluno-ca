// Coloca no app o programa de treino de um aluno a partir de um JSON (lido do documento/PDF do ciclo).
// Cada exercício é ligado à lista pelo nome (ignorando acento, maiúscula e "com/na/no/de"), e herda
// grupo, equipamento e vídeo de lá. O programa ativo anterior (se houver) vai para o histórico.
// O ciclo também é acertado: mesmo início do ciclo ativo = completa objetivo e links; início novo = cria o
// próximo ciclo (renovação). Assim a semana do ciclo, o link do programa e o do prontuário ficam na ficha.
// Uso: npx tsx --env-file=.env.local scripts/importar-programa.ts <aluno_id> <programa.json> [--gravar | --so-ciclo]
//      --so-ciclo: só acerta o ciclo e liga o programa ativo a ele (programa já importado antes)
//
// JSON: { nome, observacoes, ciclo: { inicio: "AAAA-MM-DD", semanas?, objetivo, link_ciclo, link_prontuario },
//         evolucao?: Semana[], cardio?: { orientacoes, sessoes: [{ nome: "Quarta · corrida de qualidade", semanas: ["25min leves", ...] }] },
//         treinos: [{ nome, foco, observacoes,
//         exercicios: [{ nome, prescricao: Semana[] | "evolucao", aquecimento?, observacoes?, metrica? }] }] }
// Semana = { series, min, max, pausa }

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { clienteAdmin } from "./comum.ts";
import { chaveExercicio as chave, type SemanaPrescrita } from "../lib/treino.ts";

type ExJson = { nome: string; prescricao: SemanaPrescrita[] | "evolucao"; aquecimento?: number; observacoes?: string; metrica?: "reps" | "segundos"; superset?: boolean };
type CicloJson = { inicio: string; semanas?: number; objetivo?: string; link_ciclo?: string; link_prontuario?: string };
type ProgJson = { nome: string; observacoes?: string; ciclo?: CicloJson; evolucao?: SemanaPrescrita[]; cardio?: unknown; treinos: { nome: string; foco?: string; observacoes?: string; exercicios: ExJson[] }[] };

const [alunoId, arquivo, flag] = process.argv.slice(2);
const gravar = flag === "--gravar";
const soCiclo = flag === "--so-ciclo";
const prog = JSON.parse(readFileSync(arquivo, "utf8")) as ProgJson;

const admin = clienteAdmin();
const { data: lista } = await admin.from("exercicios").select("id, nome, grupo, equipamento, video_url, metrica");
const porChave = new Map((lista ?? []).map((e) => [chave(e.nome), e]));
/** Nome exato (pela chave) ou, se não houver, o exercício da lista cujo nome contém todas as palavras do pedido. */
const acharNaLista = (nome: string) => {
  const k = chave(nome);
  if (porChave.has(k)) return porChave.get(k)!;
  const palavras = k.split(" ");
  const candidatos = (lista ?? []).filter((e) => palavras.every((p) => chave(e.nome).split(" ").includes(p)));
  return candidatos.length === 1 ? candidatos[0] : null;
};

/** Ciclo do programa: completa o ativo (mesmo início) ou cria o próximo (renovação). */
async function acertarCiclo(c: CicloJson | undefined, aplicar: boolean): Promise<string | null> {
  const { data: ativo } = await admin.from("ciclos").select("id, numero, inicio").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle();
  if (!c) {
    console.log(`Ciclo: o JSON não traz o ciclo; ${ativo ? `programa fica no ciclo ${ativo.numero}` : "aluno SEM ciclo no app"}.`);
    return ativo?.id ?? null;
  }
  const dados = { semanas: c.semanas ?? 8, objetivo: c.objetivo ?? null, link_ciclo: c.link_ciclo ?? null, link_prontuario: c.link_prontuario ?? null };
  if (ativo && ativo.inicio === c.inicio) {
    console.log(`Ciclo: completa o ciclo ${ativo.numero} (início ${c.inicio}) com objetivo e links.`);
    if (aplicar) await admin.from("ciclos").update(dados).eq("id", ativo.id);
    return ativo.id;
  }
  const { data: ultimo } = await admin.from("ciclos").select("numero").eq("aluno_id", alunoId).order("numero", { ascending: false }).limit(1).maybeSingle();
  const numero = (ultimo?.numero ?? 0) + 1;
  console.log(`Ciclo: cria o ciclo ${numero} começando em ${c.inicio}${ativo ? ` (o ${ativo.numero} vai para o histórico)` : ""}.`);
  if (!aplicar) return null;
  if (ativo) await admin.from("ciclos").update({ ativo: false }).eq("id", ativo.id);
  const { data, error } = await admin.from("ciclos").insert({ aluno_id: alunoId, numero, inicio: c.inicio, ...dados }).select("id").single();
  if (error) throw error;
  return data.id;
}

if (soCiclo) {
  const cicloId = await acertarCiclo(prog.ciclo, true);
  await admin.from("programas").update({ ciclo_id: cicloId }).eq("aluno_id", alunoId).eq("ativo", true);
  console.log("Ciclo acertado e programa ativo ligado a ele.");
  process.exit(0);
}
const cicloId = await acertarCiclo(prog.ciclo, gravar);
const programaId = randomUUID();
const treinos = prog.treinos.map((t, i) => ({ id: randomUUID(), programa_id: programaId, aluno_id: alunoId, ordem: i + 1, nome: t.nome, foco: t.foco ?? null, observacoes: t.observacoes ?? null }));
const exercicios = prog.treinos.flatMap((t, i) =>
  t.exercicios.map((e, j) => {
    const l = acharNaLista(e.nome);
    const prescricao = e.prescricao === "evolucao" ? prog.evolucao! : e.prescricao;
    console.log(`${t.nome} · ${e.nome} → ${l ? `${l.nome}${l.video_url ? " (com vídeo)" : " (SEM vídeo)"}` : "NÃO ACHADO NA LISTA"} · ${prescricao.length > 1 ? "muda por semana" : `${prescricao[0].series}x${prescricao[0].min}-${prescricao[0].max}`}`);
    return {
      id: randomUUID(), treino_id: treinos[i].id, aluno_id: alunoId, ordem: j + 1,
      exercicio_id: l?.id ?? null, nome: l?.nome ?? e.nome, grupo: l?.grupo ?? null, equipamento: l?.equipamento ?? null, video_url: l?.video_url ?? null,
      metrica: e.metrica ?? l?.metrica ?? "reps", aquecimento: e.aquecimento ?? 0, observacoes: e.observacoes ?? null, superset: e.superset ?? false, prescricao,
    };
  }),
);

if (!gravar) {
  console.log("\n(simulação: nada gravado)");
} else {
  await admin.from("programas").update({ ativo: false }).eq("aluno_id", alunoId).eq("ativo", true);
  const r1 = await admin.from("programas").insert({ id: programaId, aluno_id: alunoId, ciclo_id: cicloId, nome: prog.nome, observacoes: prog.observacoes ?? null, cardio: prog.cardio ?? null });
  if (r1.error) throw r1.error;
  const r2 = await admin.from("treinos").insert(treinos);
  if (r2.error) throw r2.error;
  const r3 = await admin.from("exercicios_treino").insert(exercicios);
  if (r3.error) throw r3.error;
  console.log(`\nGravado: ${treinos.length} treinos, ${exercicios.length} exercícios.`);
}
