import { test } from "node:test";
import assert from "node:assert/strict";
import { prazoDaSemana, sinaisDeAlerta } from "./acompanhamento.ts";

// 2026-10-01 é quinta-feira. Semana 1 do ciclo: 01/10 (qui) a 07/10 (qua).
const ciclo = { inicio: "2026-10-01", semanas: 8, dias_pausados: 0, pausado_desde: null };
const SEGUNDA = 1;

test("vence na segunda dentro da semana do ciclo", () => {
  const p = prazoDaSemana(ciclo, SEGUNDA, "2026-10-02");
  assert.equal(p.tipo === "ativo" && p.vence, "2026-10-05");
  assert.equal(p.tipo === "ativo" && p.diasAtraso, 0);
});

test("no dia combinado é hoje", () => {
  const p = prazoDaSemana(ciclo, SEGUNDA, "2026-10-05");
  assert.equal(p.tipo === "ativo" && p.ehHoje, true);
});

test("dois dias depois conta atraso", () => {
  const p = prazoDaSemana(ciclo, SEGUNDA, "2026-10-07");
  assert.equal(p.tipo === "ativo" && p.diasAtraso, 2);
  assert.equal(p.tipo === "ativo" && p.semana, 1);
});

test("semana seguinte zera o atraso", () => {
  const p = prazoDaSemana(ciclo, SEGUNDA, "2026-10-08");
  assert.equal(p.tipo === "ativo" && p.semana, 2);
  assert.equal(p.tipo === "ativo" && p.vence, "2026-10-12");
});

test("sem ciclo ou ciclo encerrado", () => {
  assert.equal(prazoDaSemana(null, SEGUNDA, "2026-10-08").tipo, "sem_ciclo");
  assert.equal(prazoDaSemana(ciclo, SEGUNDA, "2027-01-01").tipo, "fora_do_ciclo");
});

test("sinais de alerta", () => {
  assert.deepEqual(sinaisDeAlerta({ dor: true, dor_onde: "ombro", sono: 4 }), ["Dor: ombro"]);
  assert.deepEqual(sinaisDeAlerta({ dor: false, treinos_planejados: 4, treinos_feitos: 1, energia: 2 }), ["Menos da metade dos treinos", "Energia baixa"]);
});
