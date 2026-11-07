"use client";

import { useState } from "react";
import { HeartPulse, Loader2, Plus, Trash2 } from "lucide-react";
import type { Cardio, SessaoCardio } from "@/lib/treino";

const MODELO: SessaoCardio[] = [
  { nome: "Quarta · corrida de qualidade", semanas: [] },
  { nome: "Sexta · corrida leve", semanas: [] },
  { nome: "Domingo · corrida de base", semanas: [] },
];

/** Cardio do programa: cada sessão da semana com o que fazer em cada semana do ciclo (uma linha por semana).
 *  O aluno vê na aba Treino só o da semana dele e marca como feito. */
export function EditorCardio(p: { inicial: Cardio | null; semanas: number; salvar: (c: Cardio) => Promise<{ erro?: string; ok?: string }> }) {
  const [orientacoes, setOrientacoes] = useState(p.inicial?.orientacoes ?? "");
  const [sessoes, setSessoes] = useState<SessaoCardio[]>(p.inicial?.sessoes ?? []);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; erro?: string } | null>(null);

  const mudar = (i: number, s: Partial<SessaoCardio>) => setSessoes((l) => l.map((x, j) => (j === i ? { ...x, ...s } : x)));
  const semanaTexto = (s: SessaoCardio, n: number) => s.semanas[n] ?? "";

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    setMsg(await p.salvar({ orientacoes, sessoes }).catch(() => ({ erro: "Não consegui salvar." })));
    setSalvando(false);
  }

  return (
    <div className="space-y-4">
      {!sessoes.length && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setSessoes(MODELO.map((m) => ({ ...m, semanas: Array(p.semanas).fill("") })))} className="botao-secundario !py-1.5 text-sm">
            <HeartPulse className="size-4" /> Usar modelo de corrida (quarta, sexta, domingo)
          </button>
          <button type="button" onClick={() => setSessoes([{ nome: "", semanas: Array(p.semanas).fill("") }])} className="botao-secundario !py-1.5 text-sm">
            <Plus className="size-4" /> Sessão em branco
          </button>
        </div>
      )}

      {sessoes.map((s, i) => (
        <div key={i} className="rounded-xl border border-borda p-3">
          <div className="mb-2 flex items-center gap-2">
            <input className="campo font-semibold" value={s.nome} onChange={(e) => mudar(i, { nome: e.target.value })} placeholder="Ex.: Quarta · corrida de qualidade" aria-label="Nome da sessão" />
            <button type="button" onClick={() => setSessoes((l) => l.filter((_, j) => j !== i))} className="botao-secundario !p-2" aria-label="Tirar sessão"><Trash2 className="size-4" /></button>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {Array.from({ length: p.semanas }, (_, n) => (
              <label key={n} className="flex items-center gap-2 text-sm">
                <span className="w-9 shrink-0 text-xs font-semibold text-texto-suave">S{n + 1}</span>
                <input
                  className="campo !py-1.5 text-sm"
                  value={semanaTexto(s, n)}
                  onChange={(e) => {
                    const semanas = [...s.semanas];
                    while (semanas.length < p.semanas) semanas.push("");
                    semanas[n] = e.target.value;
                    mudar(i, { semanas });
                  }}
                  placeholder={n === 0 ? "Ex.: 25min leves (vazio = sem sessão)" : ""}
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      {sessoes.length > 0 && (
        <button type="button" onClick={() => setSessoes((l) => [...l, { nome: "", semanas: Array(p.semanas).fill("") }])} className="botao-secundario !py-1.5 text-sm">
          <Plus className="size-4" /> Outra sessão
        </button>
      )}

      <label className="block">
        <span className="rotulo">Orientações do cardio (intensidade, aquecimento, cuidados)</span>
        <textarea className="campo mt-1 text-sm" rows={5} value={orientacoes} onChange={(e) => setOrientacoes(e.target.value)} placeholder="Ex.: Leve/base: dá para conversar em frases completas (4-5/10). Trechos fortes: ~7/10, sem sprint. Antes: 5min de caminhada..." />
      </label>

      <div className="flex items-center gap-3">
        <button type="button" onClick={salvar} disabled={salvando} className="botao">{salvando && <Loader2 className="size-4 animate-spin" />} Salvar cardio</button>
        {msg?.ok && <span className="text-sm text-ok">{msg.ok}</span>}
        {msg?.erro && <span className="text-sm text-perigo">{msg.erro}</span>}
      </div>
    </div>
  );
}
