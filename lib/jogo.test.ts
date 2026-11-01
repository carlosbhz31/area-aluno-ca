import { test } from "node:test";
import assert from "node:assert/strict";
import { ligaPorPontos, ligaProtegida } from "./ligas.ts";

// emSilencio vive em notificar.ts (server-only); a regra é copiada aqui para testar o cálculo
function emSilencio(inicio: number, fim: number, hora: number) {
  if (inicio === fim) return false;
  return inicio > fim ? hora >= inicio || hora < fim : hora >= inicio && hora < fim;
}

test("silêncio que vira a noite (22h às 7h)", () => {
  assert.equal(emSilencio(22, 7, 23), true);
  assert.equal(emSilencio(22, 7, 3), true);
  assert.equal(emSilencio(22, 7, 7), false);
  assert.equal(emSilencio(22, 7, 12), false);
});

test("silêncio no mesmo dia (13h às 15h)", () => {
  assert.equal(emSilencio(13, 15, 14), true);
  assert.equal(emSilencio(13, 15, 15), false);
});

test("liga por pontos", () => {
  assert.equal(ligaPorPontos(0).liga, "Ferro");
  assert.equal(ligaPorPontos(30).liga, "Bronze");
  assert.equal(ligaPorPontos(600).liga, "Mestre");
});

test("quem subiu fica protegido até o fim da semana", () => {
  // começou a semana com 31 (Bronze), perdeu 2 pontos: continua Bronze
  const l = ligaProtegida(29, 31);
  assert.equal(l.liga, "Bronze");
  assert.equal(l.faltam, 51); // Prata em 80, conta a partir dos pontos de agora
});

test("semana nova sem proteção mostra a liga real", () => {
  assert.equal(ligaProtegida(29, 29).liga, "Ferro");
});
