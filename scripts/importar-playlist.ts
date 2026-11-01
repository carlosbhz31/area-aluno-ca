// Cadastra os vídeos da playlist "Exercicios App" na lista de exercícios.
// Entrada: JSON [{ id, t }] com o id do vídeo e o título (lido da página da playlist).
// Exercício que já existe com o mesmo nome (ignorando acento, maiúscula e "com/na/no/de") ganha o vídeo;
// os outros entram como novos, com grupo e equipamento deduzidos do título.
// Uso: npx tsx --env-file=.env.local scripts/importar-playlist.ts playlist.json [--gravar]

import { readFileSync } from "node:fs";
import { clienteAdmin } from "./comum.ts";
import { chaveExercicio as chave } from "../lib/treino.ts";

const [arquivo, flag] = process.argv.slice(2);
const gravar = flag === "--gravar";
const videos = JSON.parse(readFileSync(arquivo, "utf8")) as { id: string; t: string }[];

const sem = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function grupo(t: string): string {
  const s = sem(t);
  const r: [RegExp, string][] = [
    [/mobility|mobilidade/, "Mobilidade"],
    [/abdominal|prancha|pallof/, "Abdômen"],
    [/panturrilha/, "Panturrilha"],
    [/hiperextens|lombar/, "Lombar"],
    [/adu[cç]ao/, "Adutores"],
    [/abdu[cç]ao|gluteo|pelvica|elevacao de quadril|caminhada lateral/, "Glúteos"],
    [/stiff|flexora|flexao de joelho|meio terra|agachamento terra/, "Posteriores"],
    [/agachamento|leg press|extensora|afundo|avanco|passada|step up|hack/, "Quadríceps"],
    [/triceps|extensao triceps/, "Tríceps"],
    [/rosca de punho/, "Antebraço"],
    [/rosca/, "Bíceps"],
    [/crucifixo inverso|face pull|desenvolvimento|elevacao lateral|elevacao frontal|elevacao y|remada alta|encolhimento|manguito|rotacao externa/, "Ombros"],
    [/supino|crucifixo|crossover|flexao de bracos/, "Peito"],
    [/puxada|remada|pulldown|pullover|barra fixa|barra livre|serratil/, "Costas"],
  ];
  return r.find(([re]) => re.test(s))?.[1] ?? "Outros";
}

function equipamento(t: string): string | null {
  const s = sem(t);
  const r: [RegExp, string][] = [
    [/smith|guiad/, "Smith"], [/belt squat/, "Belt squat"], [/graviton/, "Gráviton"], [/polia|crossover|face pull|pulldown|pallof/, "Polia"],
    [/halter/, "Halteres"], [/maquina|articulad|hack|leg press|extensora|flexora|cadeira|mesa/, "Máquina"], [/barra/, "Barra"],
    [/mini band/, "Mini band"], [/banco romano/, "Banco romano"],
  ];
  return r.find(([re]) => re.test(s))?.[1] ?? null;
}

const admin = clienteAdmin();
const { data: lista } = await admin.from("exercicios").select("id, nome, video_url");
const porChave = new Map((lista ?? []).map((e) => [chave(e.nome), e]));
const idDoVideo = (url: string | null) => url?.match(/(?:shorts\/|v=|youtu\.be\/)([\w-]+)/)?.[1];
const videosUsados = new Set((lista ?? []).map((e) => idDoVideo(e.video_url)).filter(Boolean));

const ignorar = (t: string) => /projeto recomeco/i.test(sem(t));
const vistos = new Set<string>();
const comVideo: string[] = [];
const novos: { nome: string; grupo: string; equipamento: string | null; video_url: string; metrica: string }[] = [];

for (const v of videos) {
  if (ignorar(v.t)) continue;
  const nome = v.t.replace(/\s+/g, " ").replace(/ Por Thauane Furquim$/i, "").trim();
  const k = chave(nome);
  if (vistos.has(k)) continue; // título repetido na playlist: fica o primeiro
  vistos.add(k);
  const url = `https://youtube.com/shorts/${v.id}`;
  const existente = porChave.get(k);
  if (existente) {
    if (existente.video_url !== url) comVideo.push(`${existente.nome}  ←  ${nome}`);
    if (gravar && existente.video_url !== url) {
      await admin.from("exercicios").update({ video_url: url }).eq("id", existente.id);
      await admin.from("exercicios_treino").update({ video_url: url }).eq("exercicio_id", existente.id);
    }
  } else if (videosUsados.has(v.id)) {
    continue; // o vídeo já está num exercício com outro nome (ex.: "Elevação lateral"): não duplica
  } else {
    novos.push({ nome, grupo: grupo(nome), equipamento: equipamento(nome), video_url: url, metrica: /prancha|isometric/i.test(sem(nome)) ? "segundos" : "reps" });
  }
}

const usadas = new Set(videos.map((v) => chave(v.t.replace(/ Por Thauane Furquim$/i, ""))));
const semPar = (lista ?? []).filter((e) => !usadas.has(chave(e.nome)) && !e.video_url).map((e) => e.nome);

console.log(`Já na lista, ganham vídeo (${comVideo.length}):\n  ${comVideo.join("\n  ")}`);
console.log(`\nNovos (${novos.length}):\n  ${novos.map((n) => `${n.nome} [${n.grupo}${n.equipamento ? " · " + n.equipamento : ""}${n.metrica === "segundos" ? " · seg" : ""}]`).join("\n  ")}`);
console.log(`\nDa lista atual, sem vídeo na playlist (${semPar.length}):\n  ${semPar.join("\n  ")}`);
if (gravar && novos.length) {
  const { error } = await admin.from("exercicios").insert(novos);
  if (error) throw error;
}
console.log(gravar ? "\nGravado." : "\n(simulação: nada gravado; rode com --gravar)");
