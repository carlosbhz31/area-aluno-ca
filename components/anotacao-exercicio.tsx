"use client";

import { useState } from "react";
import { Loader2, NotebookPen, Pencil } from "lucide-react";
import type { Anotacao } from "@/lib/treino";

/** Anotação / lembrete de um exercício (ajuste do banco, posicionamento...).
 *  O aluno e o professor escrevem no mesmo lugar; vale em todos os ciclos. */
export function AnotacaoExercicio(p: {
  chave: string;
  nome: string;
  inicial: Anotacao | null;
  quem: "aluno" | "professor";
  salvar: (chave: string, nome: string, texto: string) => Promise<{ erro?: string }>;
  /** Prévia do professor: mostra, mas não salva. */
  somenteLer?: boolean;
}) {
  const [nota, setNota] = useState(p.inicial);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(p.inicial?.texto ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const autor = (n: Anotacao) => (n.por === p.quem ? "sua" : n.por === "professor" ? "do Carlos" : "do aluno");

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const r = await p.salvar(p.chave, p.nome, texto).catch(() => ({ erro: "Não consegui salvar. Confere a internet." }));
    setSalvando(false);
    if (r.erro) return setErro(r.erro);
    setNota(texto.trim() ? { texto: texto.trim(), por: p.quem, em: new Date().toISOString() } : null);
    setEditando(false);
  }

  if (editando) {
    return (
      <div className="mt-2 space-y-2 rounded-lg border border-borda p-2">
        <textarea
          className="campo text-sm"
          rows={3}
          autoFocus
          maxLength={1000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: banco na posição 4, pegada fechada, apoiar bem a lombar..."
        />
        {erro && <p className="text-xs text-perigo">{erro}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={salvar} disabled={salvando} className="botao flex-1 !py-2 text-sm">
            {salvando && <Loader2 className="size-4 animate-spin" />} Salvar
          </button>
          <button type="button" onClick={() => { setEditando(false); setTexto(nota?.texto ?? ""); }} className="botao-secundario !py-2 text-sm">Cancelar</button>
        </div>
      </div>
    );
  }

  if (nota?.texto) {
    return (
      <button
        type="button"
        onClick={() => !p.somenteLer && setEditando(true)}
        className="mt-2 flex w-full items-start gap-2 rounded-lg border border-alerta/40 bg-alerta-suave p-2 text-left text-sm"
      >
        <NotebookPen className="mt-0.5 size-4 shrink-0 text-alerta" />
        <span className="min-w-0 flex-1">
          <span className="block whitespace-pre-line">{nota.texto}</span>
          <span className="block text-[11px] text-texto-suave">Anotação {autor(nota)}</span>
        </span>
        {!p.somenteLer && <Pencil className="mt-0.5 size-3.5 shrink-0 text-texto-suave" />}
      </button>
    );
  }

  if (p.somenteLer) return null;
  return (
    <button type="button" onClick={() => setEditando(true)} className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-texto-suave">
      <NotebookPen className="size-3.5" /> Adicionar anotação (ajuste, posição...)
    </button>
  );
}
