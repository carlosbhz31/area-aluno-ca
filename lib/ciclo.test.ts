import { test } from "node:test";
import assert from "node:assert/strict";
import { situacaoDoCiclo, emRetaFinal, hojeEmBH } from "./ciclo.ts";

const base = { inicio: "2026-10-01", semanas: 8, dias_pausados: 0, pausado_desde: null };

test("sem ciclo", () => {
  assert.deepEqual(situacaoDoCiclo(null, "2026-10-10"), { tipo: "sem_ciclo" });
});

test("primeiro dia é semana 1, dia 1", () => {
  const s = situacaoDoCiclo(base, "2026-10-01");
  assert.equal(s.tipo, "em_andamento");
  if (s.tipo === "em_andamento") {
    assert.equal(s.semana, 1);
    assert.equal(s.diaDaSemana, 1);
  }
});

test("dia 8 vira semana 2", () => {
  const s = situacaoDoCiclo(base, "2026-10-08");
  assert.equal(s.tipo === "em_andamento" && s.semana, 2);
});

test("último dia ainda é semana 8; dia seguinte encerra", () => {
  const s = situacaoDoCiclo(base, "2026-11-25");
  assert.equal(s.tipo === "em_andamento" && s.semana, 8);
  assert.equal(situacaoDoCiclo(base, "2026-11-26").tipo, "encerrado");
});

test("antes do início mostra quantos dias faltam", () => {
  assert.deepEqual(situacaoDoCiclo(base, "2026-09-28"), { tipo: "nao_iniciado", diasParaComecar: 3 });
});

test("dias pausados empurram a semana", () => {
  const s = situacaoDoCiclo({ ...base, dias_pausados: 7 }, "2026-10-15");
  assert.equal(s.tipo === "em_andamento" && s.semana, 2);
});

test("pausa em curso congela a semana", () => {
  const s = situacaoDoCiclo({ ...base, pausado_desde: "2026-10-10" }, "2026-11-20");
  assert.equal(s.tipo === "em_andamento" && s.semana, 2);
  assert.equal(s.tipo === "em_andamento" && s.pausado, true);
});

test("semana 7 é reta final", () => {
  assert.equal(emRetaFinal(situacaoDoCiclo(base, "2026-11-12")), true);
  assert.equal(emRetaFinal(situacaoDoCiclo(base, "2026-11-11")), false);
});

test("hoje em BH vira o dia certo perto da meia-noite UTC", () => {
  assert.equal(hojeEmBH(new Date("2026-11-02T02:00:00Z")), "2026-11-01");
});
