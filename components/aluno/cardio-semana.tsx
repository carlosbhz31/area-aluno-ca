"use client";

import { useState } from "react";
import { Check, HeartPulse, Loader2 } from "lucide-react";
import { marcarCardio } from "@/app/(aluno)/treino/acoes";

type Sessao = { indice: number; nome: string; texto: string; feito: { minutos: number | null; distancia_km: number | null } | null };

/** Cardio da semana do ciclo: o que fazer em cada sessão e o botão de marcar como feito. */
export function CardioSemana(p: { programaId: string; semana: number; sessoes: Sessao[]; orientacoes: string | null; previa?: boolean }) {
  const [feitos, setFeitos] = useState(() => new Map(p.sessoes.filter((s) => s.feito).map((s) => [s.indice, s.feito!])));
  const [abrindo, setAbrindo] = useState<number | null>(null);
  const [minutos, setMinutos] = useState("");
  const [distancia, setDistancia] = useState("");
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function marcar(s: Sessao, feito: boolean) {
    setErro(null);
    if (p.previa) {
      setFeitos((m) => { const n = new Map(m); if (feito) n.set(s.indice, { minutos: null, distancia_km: null }); else n.delete(s.indice); return n; });
      return setAbrindo(null);
    }
    setOcupado(s.indice);
    const r = await marcarCardio({ programaId: p.programaId, semana: p.semana, sessao: s.indice, nome: s.nome, feito, minutos, distancia }).catch(() => ({ erro: "Sem internet." }));
    setOcupado(null);
    if (r?.erro) return setErro(r.erro);
    setFeitos((m) => {
      const n = new Map(m);
      if (feito) n.set(s.indice, { minutos: Number(minutos) || null, distancia_km: Number(distancia.replace(",", ".")) || null });
      else n.delete(s.indice);
      return n;
    });
    setAbrindo(null);
    setMinutos("");
    setDistancia("");
  }

  return (
    <section className="cartao p-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <HeartPulse className="size-5 text-marca" /> Cardio da semana {p.semana}
        <span className="ml-auto text-sm font-normal text-texto-suave">{feitos.size}/{p.sessoes.length}</span>
      </h2>
      <ul className="space-y-2">
        {p.sessoes.map((s) => {
          const f = feitos.get(s.indice);
          return (
            <li key={s.indice} className={`rounded-xl border p-3 ${f ? "border-ok/40 bg-ok-suave" : "border-borda"}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-texto-suave">{s.nome}</p>
                  <p className="font-semibold">{s.texto}</p>
                  {f && (f.minutos || f.distancia_km) && (
                    <p className="text-xs text-ok">Feito{f.minutos ? ` · ${f.minutos} min` : ""}{f.distancia_km ? ` · ${String(f.distancia_km).replace(".", ",")} km` : ""}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => (f ? marcar(s, false) : setAbrindo(abrindo === s.indice ? null : s.indice))}
                  className={`grid size-11 shrink-0 place-items-center rounded-xl border-2 ${f ? "border-ok bg-ok text-white" : "border-borda text-texto-suave"}`}
                  aria-label={f ? "Desmarcar" : "Marcar como feito"}
                >
                  {ocupado === s.indice ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
                </button>
              </div>
              {abrindo === s.indice && !f && (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="w-24 text-xs text-texto-suave">Minutos<input className="campo mt-1 !py-2" inputMode="numeric" value={minutos} onChange={(e) => setMinutos(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="opcional" /></label>
                  <label className="w-24 text-xs text-texto-suave">Km<input className="campo mt-1 !py-2" inputMode="decimal" value={distancia} onChange={(e) => setDistancia(e.target.value.replace(/[^\d.,]/g, "").slice(0, 5))} placeholder="opcional" /></label>
                  <button type="button" onClick={() => marcar(s, true)} className="botao flex-1 !py-2.5"><Check className="size-4" /> Fiz</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {erro && <p className="mt-2 text-sm text-perigo">{erro}</p>}
      {p.orientacoes && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-semibold text-marca">Como fazer (intensidade e aquecimento)</summary>
          <p className="mt-2 whitespace-pre-line text-texto-suave">{p.orientacoes}</p>
        </details>
      )}
    </section>
  );
}
