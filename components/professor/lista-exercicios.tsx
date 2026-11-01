"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Search, Trash2, Video, X } from "lucide-react";
import { excluirExercicio, salvarExercicio, type ExercicioLista } from "@/app/professor/treino-acoes";
import { GRUPOS } from "@/lib/treino";

const VAZIO: Omit<ExercicioLista, "id"> = { nome: "", grupo: null, equipamento: null, video_url: null, metrica: "reps", observacoes: null };

/** Lista de exercícios do professor: busca, filtro por grupo e edição (o vídeo do YouTube fica aqui). */
export function ListaExercicios({ exercicios, usos }: { exercicios: ExercicioLista[]; usos: Record<string, number> }) {
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState("");
  const [editando, setEditando] = useState<(Omit<ExercicioLista, "id"> & { id?: string }) | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const filtrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return exercicios.filter((e) => (!grupo || e.grupo === grupo) && (!b || e.nome.toLowerCase().includes(b) || (e.equipamento ?? "").toLowerCase().includes(b)));
  }, [exercicios, busca, grupo]);
  const porGrupo = useMemo(() => {
    const m = new Map<string, ExercicioLista[]>();
    for (const e of filtrados) m.set(e.grupo ?? "Sem grupo", [...(m.get(e.grupo ?? "Sem grupo") ?? []), e]);
    return [...m.entries()].sort(([a], [b]) => (GRUPOS.indexOf(a) + 99) % 99 - (GRUPOS.indexOf(b) + 99) % 99);
  }, [filtrados]);
  const semVideo = exercicios.filter((e) => !e.video_url).length;

  function salvar() {
    if (!editando) return;
    setErro(null);
    iniciar(async () => {
      const r = await salvarExercicio(editando);
      if (r.erro) setErro(r.erro);
      else setEditando(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-suave" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar exercício ou equipamento" className="campo !pl-9" />
        </label>
        <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="campo !w-auto">
          <option value="">Todos os grupos</option>
          {GRUPOS.map((g) => <option key={g}>{g}</option>)}
        </select>
        <button onClick={() => { setErro(null); setEditando({ ...VAZIO, grupo: grupo || null, nome: busca }); }} className="botao">
          <Plus className="size-4" /> Novo exercício
        </button>
      </div>
      <p className="text-sm text-texto-suave">
        {exercicios.length} exercícios{semVideo ? ` · ${semVideo} ainda sem vídeo` : " · todos com vídeo"}. O vídeo trocado aqui passa a valer em todas as fichas que usam o exercício.
      </p>

      {editando && (
        <div className="cartao space-y-3 border-marca p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editando.id ? "Editar exercício" : "Novo exercício"}</h2>
            <button onClick={() => setEditando(null)} aria-label="Fechar"><X className="size-5 text-texto-suave" /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="rotulo">Nome</span>
              <input autoFocus value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} className="campo mt-1" />
            </label>
            <label><span className="rotulo">Grupo muscular</span>
              <select value={editando.grupo ?? ""} onChange={(e) => setEditando({ ...editando, grupo: e.target.value || null })} className="campo mt-1">
                <option value="">—</option>
                {GRUPOS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </label>
            <label><span className="rotulo">Equipamento</span>
              <input value={editando.equipamento ?? ""} onChange={(e) => setEditando({ ...editando, equipamento: e.target.value })} placeholder="Polia, halteres, máquina…" className="campo mt-1" />
            </label>
            <label className="sm:col-span-2"><span className="rotulo">Link do vídeo no YouTube</span>
              <input value={editando.video_url ?? ""} onChange={(e) => setEditando({ ...editando, video_url: e.target.value })} placeholder="https://youtube.com/shorts/…" inputMode="url" className="campo mt-1" />
            </label>
            <label><span className="rotulo">Mede por</span>
              <select value={editando.metrica} onChange={(e) => setEditando({ ...editando, metrica: e.target.value as ExercicioLista["metrica"] })} className="campo mt-1">
                <option value="reps">Repetições</option>
                <option value="segundos">Segundos (prancha, isometria)</option>
              </select>
            </label>
            <label className="sm:col-span-2"><span className="rotulo">Dica de execução (aparece para o aluno)</span>
              <textarea rows={2} value={editando.observacoes ?? ""} onChange={(e) => setEditando({ ...editando, observacoes: e.target.value })} className="campo mt-1" />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={salvar} disabled={pendente} className="botao">{pendente && <Loader2 className="size-4 animate-spin" />} Salvar</button>
            {erro && <p className="text-sm text-perigo">{erro}</p>}
          </div>
        </div>
      )}

      {porGrupo.map(([g, lista]) => (
        <section key={g} className="cartao p-0">
          <h2 className="border-b border-borda px-4 py-2 text-sm font-semibold text-texto-suave">{g} · {lista.length}</h2>
          <ul className="divide-y divide-borda">
            {lista.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.nome}</p>
                  <p className="text-xs text-texto-suave">
                    {[e.equipamento, e.metrica === "segundos" ? "em segundos" : null, usos[e.id] ? `em ${usos[e.id]} ficha${usos[e.id] > 1 ? "s" : ""}` : null].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {e.video_url ? (
                  <a href={e.video_url} target="_blank" rel="noopener noreferrer" className="text-marca" aria-label="Ver vídeo"><Video className="size-5" /></a>
                ) : (
                  <span className="text-[11px] text-texto-suave">sem vídeo</span>
                )}
                <button onClick={() => { setErro(null); setEditando(e); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-texto-suave" aria-label="Editar"><Pencil className="size-4" /></button>
                <button
                  onClick={() => confirm(`Tirar "${e.nome}" da lista? As fichas que já usam continuam iguais.`) && iniciar(() => excluirExercicio(e.id))}
                  className="text-texto-suave"
                  aria-label="Excluir"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!filtrados.length && <p className="text-sm text-texto-suave">Nenhum exercício encontrado.</p>}
    </div>
  );
}
