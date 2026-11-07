"use client";

import { useState } from "react";
import { dataBR, numeroBR } from "@/lib/formato";

// Linha única (peso ao longo do tempo): sem legenda, linha 2px, pontos de 8px, grade discreta,
// dica ao tocar/passar no ponto. A lista de registros abaixo do gráfico é a versão em tabela.
export function GraficoPeso({ pontos, unidade = "kg" }: { pontos: { data: string; peso: number }[]; unidade?: string }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  if (pontos.length < 2) return null;

  const L = 320, A = 150, m = { t: 12, r: 12, b: 22, l: 36 };
  const pesos = pontos.map((p) => p.peso);
  let min = Math.floor(Math.min(...pesos) - 1), max = Math.ceil(Math.max(...pesos) + 1);
  if (max - min < 4) { const meio = (max + min) / 2; min = Math.floor(meio - 2); max = Math.ceil(meio + 2); }
  const tempos = pontos.map((p) => Date.parse(p.data));
  const t0 = Math.min(...tempos), t1 = Math.max(...tempos) || t0 + 1;
  const x = (t: number) => m.l + ((t - t0) / (t1 - t0 || 1)) * (L - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - min) / (max - min)) * (A - m.t - m.b);
  const linhas = [min, (min + max) / 2, max];
  const caminho = pontos.map((p, i) => `${i ? "L" : "M"}${x(tempos[i]).toFixed(1)},${y(p.peso).toFixed(1)}`).join(" ");
  const sel = ativo != null ? pontos[ativo] : null;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img" aria-label={`De ${pesos[0]} ${unidade} a ${pesos[pesos.length - 1]} ${unidade}`} onMouseLeave={() => setAtivo(null)}>
        {linhas.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={L - m.r} y1={y(v)} y2={y(v)} stroke="var(--borda)" strokeWidth={1} />
            <text x={m.l - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="var(--texto-suave)">{Math.round(v)}</text>
          </g>
        ))}
        <text x={m.l} y={A - 6} fontSize={9} fill="var(--texto-suave)">{dataBR(pontos[0].data).slice(0, 5)}</text>
        <text x={L - m.r} y={A - 6} fontSize={9} textAnchor="end" fill="var(--texto-suave)">{dataBR(pontos[pontos.length - 1].data).slice(0, 5)}</text>
        {sel && <line x1={x(tempos[ativo!])} x2={x(tempos[ativo!])} y1={m.t} y2={A - m.b} stroke="var(--texto-suave)" strokeDasharray="3 3" strokeWidth={1} />}
        <path d={caminho} fill="none" stroke="var(--marca)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pontos.map((p, i) => (
          <g key={i}>
            <circle cx={x(tempos[i])} cy={y(p.peso)} r={i === ativo ? 5 : 4} fill="var(--marca)" stroke="var(--cartao)" strokeWidth={2} />
            {/* área de toque maior que o ponto */}
            <circle cx={x(tempos[i])} cy={y(p.peso)} r={14} fill="transparent" onMouseEnter={() => setAtivo(i)} onClick={() => setAtivo(i)} />
          </g>
        ))}
      </svg>
      {sel && (
        <figcaption
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-borda bg-cartao px-2 py-1 text-xs shadow"
          style={{ left: `${(x(tempos[ativo!]) / L) * 100}%`, top: 0 }}
        >
          <strong>{numeroBR(sel.peso)} {unidade}</strong> <span className="text-texto-suave">{dataBR(sel.data)}</span>
        </figcaption>
      )}
    </figure>
  );
}
