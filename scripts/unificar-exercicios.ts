// Junta exercícios repetidos da lista num só. O que fica recebe o nome escolhido e o vídeo de quem tiver;
// as fichas que usavam os outros passam a apontar para ele (nome e vídeo atualizados). Os outros saem da lista.
// O histórico de cargas não muda (fica preso ao exercício da ficha, não ao da lista).
// Uso: npx tsx --env-file=.env.local scripts/unificar-exercicios.ts grupos.json [--gravar]
// JSON: [{ "nome": "Nome final", "juntar": ["Nome A", "Nome B", ...] }]

import { readFileSync } from "node:fs";
import { clienteAdmin } from "./comum.ts";
import { chaveExercicio } from "../lib/treino.ts";

const [arquivo, flag] = process.argv.slice(2);
const gravar = flag === "--gravar";
const grupos = JSON.parse(readFileSync(arquivo, "utf8")) as { nome: string; juntar: string[] }[];

const admin = clienteAdmin();
const { data: lista } = await admin.from("exercicios").select("id, nome, grupo, equipamento, video_url, metrica, observacoes");
const porChave = new Map((lista ?? []).map((e) => [chaveExercicio(e.nome), e]));

for (const g of grupos) {
  const achados = [g.nome, ...g.juntar].map((n) => porChave.get(chaveExercicio(n))).filter((e, i, a) => e && a.indexOf(e) === i) as NonNullable<ReturnType<typeof porChave.get>>[];
  const faltando = g.juntar.filter((n) => !porChave.has(chaveExercicio(n)));
  if (!achados.length) {
    console.log(`✗ ${g.nome}: nenhum encontrado`);
    continue;
  }
  // Fica o que já tem o nome final; se nenhum tiver, o primeiro com vídeo; senão o primeiro
  const fica = porChave.get(chaveExercicio(g.nome)) ?? achados.find((e) => e.video_url) ?? achados[0];
  const saem = achados.filter((e) => e.id !== fica.id);
  const video = fica.video_url ?? saem.find((e) => e.video_url)?.video_url ?? null;
  const dados = {
    nome: g.nome,
    video_url: video,
    grupo: fica.grupo ?? saem.find((e) => e.grupo)?.grupo ?? null,
    equipamento: fica.equipamento ?? saem.find((e) => e.equipamento)?.equipamento ?? null,
    metrica: [fica, ...saem].some((e) => e.metrica === "segundos") ? "segundos" : fica.metrica,
  };
  const ids = achados.map((e) => e.id);
  const { count } = await admin.from("exercicios_treino").select("*", { count: "exact", head: true }).in("exercicio_id", ids);
  console.log(`• ${g.nome}: fica "${fica.nome}", saem ${saem.map((e) => `"${e.nome}"`).join(", ") || "nenhum"} · vídeo ${video ? "sim" : "não"} · ${count ?? 0} exercício(s) em fichas atualizados${faltando.length ? ` · não achei: ${faltando.join(", ")}` : ""}`);

  if (!gravar) continue;
  // Apaga os que saem antes de renomear (o nome final pode ser o de um deles)
  await admin.from("exercicios_treino").update({ exercicio_id: fica.id }).in("exercicio_id", saem.map((e) => e.id));
  if (saem.length) await admin.from("exercicios").delete().in("id", saem.map((e) => e.id));
  const { error } = await admin.from("exercicios").update(dados).eq("id", fica.id);
  if (error) throw error;
  await admin.from("exercicios_treino").update({ nome: dados.nome, video_url: dados.video_url, metrica: dados.metrica }).eq("exercicio_id", fica.id);
}
console.log(gravar ? "\nGravado." : "\n(simulação: nada gravado; rode com --gravar)");
