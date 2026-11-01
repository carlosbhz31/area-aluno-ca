import { test } from "node:test";
import assert from "node:assert/strict";
import { ETAPAS, etapaPendente, etapasDo, faltando, fotosDaAnamnese, limparEtapa } from "./anamnese.ts";

const ALUNO = "11111111-1111-1111-1111-111111111111";
const etapa = (id: string) => ETAPAS.find((e) => e.id === id)!;

test("realinhamento pula os dados pessoais", () => {
  assert.equal(etapasDo("inicial")[0].id, "dados");
  assert.ok(!etapasDo("realinhamento").some((e) => e.id === "dados"));
});

test("limpa o que não é do modelo e opções inválidas", () => {
  const r = limparEtapa(etapa("rotina"), { profissao: "  Dentista ", hackeado: "x", trabalho_posicao: "Deitado", ansiedade: "11", sono_qualidade: "7" }, ALUNO);
  assert.deepEqual(r, { profissao: "Dentista", sono_qualidade: "7" });
});

test("pergunta condicional some quando a condição não vale", () => {
  const e = etapa("saude");
  assert.deepEqual(limparEtapa(e, { medicacao: "Não", medicacao_quais: "algo" }, ALUNO), { medicacao: "Não" });
  assert.deepEqual(faltando(e, { medicacao: "Sim", familia: "não", ossos: "Não" }).map((p) => p.id), ["medicacao_quais"]);
});

test("múltipla respeita o limite e fotos só da pasta do aluno", () => {
  const r = limparEtapa(etapa("objetivo"), { grupos: ["Peitoral", "Costas", "Braços", "Ombros"] }, ALUNO);
  assert.equal((r.grupos as string[]).length, 3);
  const f = limparEtapa(etapa("historico"), { treino_antigo_fotos: [`${ALUNO}/anamnese/1.jpg`, "outro/anamnese/2.jpg", `${ALUNO}/../x.jpg`] }, ALUNO);
  assert.deepEqual(f.treino_antigo_fotos, [`${ALUNO}/anamnese/1.jpg`]);
  assert.deepEqual(fotosDaAnamnese({ historico: f }), [`${ALUNO}/anamnese/1.jpg`]);
});

test("postura tem a figura de apoio", () => {
  const p = etapa("postura").perguntas.find((x) => x.id === "postura_tipo")!;
  assert.equal(p.imagem, "/anamnese/postura.png");
  assert.equal(p.opcoes!.length, 5);
});

test("etapa pendente aponta a primeira incompleta", () => {
  assert.equal(etapaPendente("inicial", {}), 0);
  assert.equal(etapaPendente("realinhamento", {}), 0);
});
