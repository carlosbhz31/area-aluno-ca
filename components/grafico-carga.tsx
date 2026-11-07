"use client";

import { useState } from "react";
import { dataBR, numeroBR } from "@/lib/formato";
import { GraficoPeso } from "./aluno/grafico-peso";

export type SerieGrafico = { chave: string; nome: string; unidade: string; pontos: { data: string; peso: number }[] };

/** Escolhe o exercício e vê a carga mais pesada de cada treino ao longo do tempo. */
export function GraficoCarga({ series }: { series: SerieGrafico[] }) {
  const [chave, setChave] = useState(series[0]?.chave);
  const s = series.find((x) => x.chave === chave) ?? series[0];
  if (!s) return null;
  const primeiro = s.pontos[0];
  const ultimo = s.pontos[s.pontos.length - 1];
  const recorde = Math.max(...s.pontos.map((p) => p.peso));
  const dif = ultimo.peso - primeiro.peso;

  return (
    <div className="space-y-3">
      <select className="campo" value={s.chave} onChange={(e) => setChave(e.target.value)} aria-label="Exercício">
        {series.map((x) => (
          <option key={x.chave} value={x.chave}>
            {x.nome} ({x.pontos.length})
          </option>
        ))}
      </select>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-fundo p-2">
          <p className="text-[11px] text-texto-suave">Última</p>
          <p className="font-bold">{numeroBR(ultimo.peso)} {s.unidade}</p>
        </div>
        <div className="rounded-xl bg-fundo p-2">
          <p className="text-[11px] text-texto-suave">Recorde</p>
          <p className="font-bold">{numeroBR(recorde)} {s.unidade}</p>
        </div>
        <div className="rounded-xl bg-fundo p-2">
          <p className="text-[11px] text-texto-suave">Desde {dataBR(primeiro.data).slice(0, 5)}</p>
          <p className={`font-bold ${dif > 0 ? "text-ok" : ""}`}>{dif > 0 ? "+" : ""}{numeroBR(dif)} {s.unidade}</p>
        </div>
      </div>
      {s.pontos.length > 1 ? (
        <GraficoPeso pontos={s.pontos} unidade={s.unidade} />
      ) : (
        <p className="text-center text-sm text-texto-suave">Só um treino com esse exercício até agora. O gráfico aparece a partir do segundo.</p>
      )}
    </div>
  );
}
