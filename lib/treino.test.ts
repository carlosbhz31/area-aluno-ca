import { test } from "node:test";
import assert from "node:assert/strict";
import { alvo, chaveSerie, numero, planoDoDia, prescricaoDaSemana, proximaSerie, tempo, type ExercicioFicha } from "./treino.ts";

const semanas = [
  { series: 3, min: 12, max: 15, pausa: 60 },
  { series: 3, min: 10, max: 12, pausa: 60 },
  { series: 4, min: 8, max: 10, pausa: 90 },
];

test("prescrição única vale para o ciclo todo", () => {
  assert.deepEqual(prescricaoDaSemana([semanas[1]], 7), semanas[1]);
});

test("prescrição por semana do ciclo, repetindo a última", () => {
  assert.deepEqual(prescricaoDaSemana(semanas, 1), semanas[0]);
  assert.deepEqual(prescricaoDaSemana(semanas, 3), semanas[2]);
  assert.deepEqual(prescricaoDaSemana(semanas, 8), semanas[2]);
  assert.deepEqual(prescricaoDaSemana(semanas, null), semanas[0]);
});

const ficha = (id: string, ordem: number, aquecimento = 0): ExercicioFicha => ({
  id, ordem, nome: id, grupo: null, equipamento: null, video_url: null, observacoes: null, metrica: "reps", aquecimento,
  prescricao: [{ series: 2, min: 10, max: 12, pausa: 60 }],
});

test("próxima série segue a ordem e pula as feitas", () => {
  const plano = planoDoDia([ficha("b", 2), ficha("a", 1, 1)], 1);
  assert.deepEqual(plano.map((e) => e.id), ["a", "b"]);
  const feitas = new Set<string>();
  const s1 = { exercicioId: "a", numero: 1, aquecimento: true };
  feitas.add(chaveSerie(s1));
  assert.deepEqual(proximaSerie(plano, feitas, s1), { exercicioId: "a", numero: 1, aquecimento: false });
  const ultimaA = { exercicioId: "a", numero: 2, aquecimento: false };
  feitas.add(chaveSerie(ultimaA));
  // pulou a série 1 de "a": depois de "b" volta para ela
  feitas.add("b:v:1");
  feitas.add("b:v:2");
  assert.deepEqual(proximaSerie(plano, feitas, { exercicioId: "b", numero: 2, aquecimento: false }), { exercicioId: "a", numero: 1, aquecimento: false });
  feitas.add("a:v:1");
  assert.equal(proximaSerie(plano, feitas, { exercicioId: "a", numero: 1, aquecimento: false }), null);
});

test("formatos", () => {
  assert.equal(alvo({ min: 10, max: 12, metrica: "reps" }), "10–12");
  assert.equal(alvo({ min: 30, max: 30, metrica: "segundos" }), "30 s");
  assert.equal(tempo(90), "1:30");
  assert.equal(tempo(45), "45 s");
  assert.equal(numero("36,25"), 36.25);
  assert.equal(numero(""), null);
  assert.equal(numero("abc"), null);
});
