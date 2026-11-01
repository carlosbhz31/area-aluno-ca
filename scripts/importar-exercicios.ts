// Traz para a lista de exercícios os que já aparecem nos treinos do app antigo (export do ChatGPT).
// Só nome, grupo, equipamento e vídeo — nada do aluno. Não sobrescreve o que já está na lista.
// Uso: npx tsx --env-file=.env.local scripts/importar-exercicios.ts dados/export-area-aluno-ca-2026-10-31.json

import { readFileSync } from "node:fs";
import { clienteAdmin } from "./comum.ts";
import { grupoPadrao } from "../lib/treino.ts";

type ExAntigo = { name: string; group?: string; equipment?: string; video?: string; metric?: string };
const arquivo = process.argv[2];
if (!arquivo) throw new Error("Informe o arquivo do export.");
const dados = JSON.parse(readFileSync(arquivo, "utf8")) as { details: Record<string, { history?: { sessions?: { snapshot?: { exercises?: ExAntigo[] } }[] } }> };

const lista = new Map<string, { nome: string; grupo: string | null; equipamento: string | null; video_url: string | null; metrica: string }>();
for (const d of Object.values(dados.details))
  for (const s of d.history?.sessions ?? [])
    for (const e of s.snapshot?.exercises ?? []) {
      const nome = e.name?.trim().replace(/\s+/g, " ");
      if (!nome) continue;
      const atual = lista.get(nome.toLowerCase());
      lista.set(nome.toLowerCase(), {
        nome,
        grupo: atual?.grupo ?? grupoPadrao(e.group),
        equipamento: atual?.equipamento || e.equipment?.trim() || null,
        video_url: atual?.video_url || e.video?.trim() || null,
        metrica: e.metric === "seconds" ? "segundos" : "reps",
      });
    }

const admin = clienteAdmin();
const { data: existentes } = await admin.from("exercicios").select("nome");
const ja = new Set((existentes ?? []).map((e) => e.nome.toLowerCase()));
const novos = [...lista.values()].filter((e) => !ja.has(e.nome.toLowerCase()));
if (novos.length) {
  const { error } = await admin.from("exercicios").insert(novos);
  if (error) throw error;
}
console.log(`${novos.length} exercícios novos na lista (${lista.size} encontrados, ${lista.size - novos.length} já existiam).`);
