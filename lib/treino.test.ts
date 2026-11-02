import { test } from "node:test";
import assert from "node:assert/strict";
import { alvo, blocos, chaveExercicio, chaveSerie, grupoPadrao, montarUltimaVez, videoYoutube, numero, pausaDepois, planoDoDia, prescricaoDaSemana, proximaSerie, seriesDoPlano, tempo, type ExercicioFicha } from "./treino.ts";

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

test("superset alterna as séries e só descansa depois do último", () => {
  const a = { ...ficha("a", 1), superset: true };
  const b = { ...ficha("b", 2), prescricao: [{ series: 3, min: 10, max: 12, pausa: 90 }] };
  const plano = planoDoDia([a, b, ficha("c", 3)], 1);
  assert.deepEqual(blocos(plano).map((x) => x.map((e) => e.id)), [["a", "b"], ["c"]]);
  assert.deepEqual(seriesDoPlano(plano).map(chaveSerie), ["a:v:1", "b:v:1", "a:v:2", "b:v:2", "b:v:3", "c:v:1", "c:v:2"]);
  const s = (id: string, n: number) => ({ exercicioId: id, numero: n, aquecimento: false });
  assert.equal(pausaDepois(plano, s("a", 1), s("b", 1)), 0);
  assert.equal(pausaDepois(plano, s("b", 1), s("a", 2)), 90);
  assert.equal(pausaDepois(plano, s("b", 3), s("c", 1)), 90);
  assert.equal(pausaDepois(plano, s("c", 1), s("c", 2)), 60);
  assert.equal(pausaDepois(plano, s("c", 2), null), 0);
});

test("grupo muscular padronizado", () => {
  assert.equal(grupoPadrao("Bíceps e antebraços"), "Bíceps");
  assert.equal(grupoPadrao("Triceps"), "Tríceps");
  assert.equal(grupoPadrao("Glúteo "), "Glúteos");
  assert.equal(grupoPadrao("Abdomem"), "Abdômen");
  assert.equal(grupoPadrao(""), null);
});

test("nomes de exercício iguais apesar de acento, maiúscula e preposição", () => {
  assert.equal(chaveExercicio("Leg press 45°"), chaveExercicio("Leg Press 45"));
  assert.equal(chaveExercicio("Panturrilha Sentado na Máquina"), chaveExercicio("Panturrilha Sentado Maquina"));
  assert.equal(chaveExercicio("Remada Baixa (Pegada Pronada)"), "remada baixa pegada pronada");
  assert.notEqual(chaveExercicio("Stiff com Halteres"), chaveExercicio("Agachamento Guiado"));
});

test("última vez: série que faltou no último treino vem de um treino mais antigo", () => {
  const l = (exec: string, numero: number, carga: number, reps: number, dia: string) => ({ execucao_id: exec, exercicio_id: "supino", numero, carga, reps, segundos: null, feita_em: dia });
  // mais recentes primeiro: semana passada 3 séries, a anterior tinha 4
  const u = montarUltimaVez([l("b", 3, 24, 10, "2026-10-29"), l("b", 2, 22, 11, "2026-10-29"), l("b", 1, 22, 12, "2026-10-29"), l("a", 4, 20, 8, "2026-10-22"), l("a", 1, 20, 10, "2026-10-22")]).supino;
  assert.deepEqual(u.series.map((s) => s.numero), [1, 2, 3]);
  assert.equal(u.porSerie[1].carga, 22);
  assert.equal(u.porSerie[4].carga, 20);
  assert.equal(u.porSerie[5], undefined);
});
