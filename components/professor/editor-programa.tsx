"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Copy, Link2, Loader2, Plus, Save, Sparkles, Trash2, Video } from "lucide-react";
import { programaParaCopiar, salvarPrograma, type ExercicioEditor, type ExercicioLista, type ProgramaEditor, type TreinoEditor } from "@/app/professor/treino-acoes";
import type { SemanaPrescrita } from "@/lib/treino";

const PADRAO: SemanaPrescrita = { series: 3, min: 10, max: 12, pausa: 60 };
const letra = (i: number) => `Treino ${String.fromCharCode(65 + i)}`;
const novoTreino = (i: number): TreinoEditor => ({ id: "", nome: letra(i), foco: null, observacoes: null, exercicios: [] });
const mover = <T,>(lista: T[], de: number, para: number) => {
  if (para < 0 || para >= lista.length) return lista;
  const n = [...lista];
  const [x] = n.splice(de, 1);
  n.splice(para, 0, x);
  return n;
};

/** Editor do programa de treino do aluno: treinos A, B, C… e os exercícios com a prescrição por semana do ciclo. */
export function EditorPrograma(p: {
  alunoId: string;
  inicial: ProgramaEditor | null;
  biblioteca: ExercicioLista[];
  semanasCiclo: number;
  nomeSugerido: string;
  outrosAlunos: { id: string; nome: string }[];
}) {
  const [prog, setProg] = useState<ProgramaEditor>(
    () => p.inicial ?? { id: "", nome: p.nomeSugerido, observacoes: null, treinos: [novoTreino(0)] },
  );
  const [novo, setNovo] = useState(!p.inicial);
  const [aba, setAba] = useState(0);
  const [mudou, setMudou] = useState(false);
  const [msg, setMsg] = useState<{ erro?: string; ok?: string } | null>(null);
  const [copiarDe, setCopiarDe] = useState("");
  const [busca, setBusca] = useState("");
  const [pendente, iniciar] = useTransition();
  const porNome = useMemo(() => new Map(p.biblioteca.map((e) => [e.nome.toLowerCase(), e])), [p.biblioteca]);
  const porId = useMemo(() => new Map(p.biblioteca.map((e) => [e.id, e])), [p.biblioteca]);

  useEffect(() => {
    if (!mudou) return;
    const avisar = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [mudou]);

  const alterar = (f: (x: ProgramaEditor) => ProgramaEditor) => {
    setProg((x) => f(structuredClone(x)));
    setMudou(true);
    setMsg(null);
  };
  const treino = prog.treinos[Math.min(aba, prog.treinos.length - 1)];
  const t = Math.min(aba, prog.treinos.length - 1);
  const alterarTreino = (f: (x: TreinoEditor) => void) => alterar((x) => (f(x.treinos[t]), x));
  const alterarEx = (j: number, f: (e: ExercicioEditor) => void) => alterarTreino((tr) => f(tr.exercicios[j]));

  function adicionarExercicio() {
    const nome = busca.trim();
    if (!nome) return;
    const daLista = porNome.get(nome.toLowerCase());
    const ultimo = treino.exercicios.at(-1);
    alterarTreino((tr) => {
      tr.exercicios.push({
        id: "",
        exercicio_id: daLista?.id ?? null,
        nome: daLista?.nome ?? nome,
        grupo: daLista?.grupo ?? null,
        equipamento: daLista?.equipamento ?? null,
        video_url: daLista?.video_url ?? null,
        metrica: daLista?.metrica ?? "reps",
        aquecimento: 0,
        observacoes: null,
        superset: false,
        // começa com a mesma prescrição do anterior: quase sempre é parecida
        prescricao: ultimo ? structuredClone(ultimo.prescricao) : [{ ...PADRAO }],
      });
    });
    setBusca("");
  }

  async function copiar() {
    if (!copiarDe) return;
    const r = await programaParaCopiar(copiarDe);
    if (!r) return setMsg({ erro: "Esse aluno não tem programa ativo." });
    setProg({ ...r, nome: p.nomeSugerido || r.nome });
    setNovo(true);
    setAba(0);
    setMudou(true);
    setMsg({ ok: "Copiado. Ajuste o que precisar e salve: o programa atual deste aluno vai para o histórico." });
  }

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarPrograma(p.alunoId, prog, novo);
      setMsg(r);
      if (r.ok) {
        setMudou(false);
        setNovo(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Copiar / programa novo */}
      <div className="cartao flex flex-wrap items-end gap-3 p-4 text-sm">
        <label className="min-w-48 flex-1">
          <span className="rotulo">Copiar o programa de outro aluno</span>
          <select value={copiarDe} onChange={(e) => setCopiarDe(e.target.value)} className="campo mt-1">
            <option value="">Escolha o aluno…</option>
            {p.outrosAlunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </label>
        <button onClick={copiar} disabled={!copiarDe} className="botao-secundario"><Copy className="size-4" /> Copiar</button>
        {p.inicial && !novo && (
          <button
            onClick={() => { alterar((x) => ({ ...x, nome: p.nomeSugerido || x.nome })); setNovo(true); }}
            className="botao-secundario"
          >
            <Sparkles className="size-4" /> Começar programa novo
          </button>
        )}
      </div>
      {novo && p.inicial && <p className="rounded-xl bg-marca-suave px-4 py-2 text-sm text-marca">Programa novo: ao salvar, o atual vai para o histórico (o que o aluno já fez continua guardado).</p>}

      <div className="cartao grid gap-3 p-4 sm:grid-cols-2">
        <label><span className="rotulo">Nome do programa</span>
          <input value={prog.nome} onChange={(e) => alterar((x) => ({ ...x, nome: e.target.value }))} className="campo mt-1" placeholder="Ciclo 3 – Hipertrofia" />
        </label>
        <label><span className="rotulo">Orientações gerais (o aluno vê)</span>
          <input value={prog.observacoes ?? ""} onChange={(e) => alterar((x) => ({ ...x, observacoes: e.target.value }))} className="campo mt-1" placeholder="Ex.: aquecer 5 min na esteira antes" />
        </label>
      </div>

      {/* Abas dos treinos */}
      <div className="flex flex-wrap items-center gap-2">
        {prog.treinos.map((tr, i) => (
          <button key={i} onClick={() => setAba(i)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${i === t ? "bg-marca text-white" : "bg-cartao text-texto-suave"}`}>
            {tr.nome || letra(i)} <span className="font-normal opacity-70">· {tr.exercicios.length}</span>
          </button>
        ))}
        <button onClick={() => { alterar((x) => ({ ...x, treinos: [...x.treinos, novoTreino(x.treinos.length)] })); setAba(prog.treinos.length); }} className="rounded-xl border border-dashed border-borda px-3 py-2 text-sm text-texto-suave">
          <Plus className="inline size-4" /> Treino
        </button>
      </div>

      <section className="cartao space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <label><span className="rotulo">Nome</span>
            <input value={treino.nome} onChange={(e) => alterarTreino((tr) => { tr.nome = e.target.value; })} className="campo mt-1" />
          </label>
          <label><span className="rotulo">Foco</span>
            <input value={treino.foco ?? ""} onChange={(e) => alterarTreino((tr) => { tr.foco = e.target.value; })} className="campo mt-1" placeholder="Peito, ombro e tríceps" />
          </label>
          <div className="flex items-end gap-1">
            <button onClick={() => { alterar((x) => ({ ...x, treinos: mover(x.treinos, t, t - 1) })); setAba(Math.max(0, t - 1)); }} className="botao-secundario !px-2.5" aria-label="Mover treino para a esquerda"><ArrowUp className="size-4 -rotate-90" /></button>
            <button onClick={() => { alterar((x) => ({ ...x, treinos: mover(x.treinos, t, t + 1) })); setAba(Math.min(prog.treinos.length - 1, t + 1)); }} className="botao-secundario !px-2.5" aria-label="Mover treino para a direita"><ArrowDown className="size-4 -rotate-90" /></button>
            <button
              onClick={() => prog.treinos.length > 1 && confirm(`Tirar o ${treino.nome}?`) && (alterar((x) => ({ ...x, treinos: x.treinos.filter((_, i) => i !== t) })), setAba(Math.max(0, t - 1)))}
              disabled={prog.treinos.length < 2}
              className="botao-secundario !px-2.5 text-perigo"
              aria-label="Excluir treino"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        <ol className="space-y-3">
          {treino.exercicios.map((e, j) => (
            <LinhaExercicio
              key={j}
              e={e}
              n={j + 1}
              ultimo={j === treino.exercicios.length - 1}
              ligadoAoAnterior={j > 0 && treino.exercicios[j - 1].superset}
              semanas={p.semanasCiclo}
              temVideo={Boolean(e.video_url || (e.exercicio_id && porId.get(e.exercicio_id)?.video_url))}
              alterar={(f) => alterarEx(j, f)}
              mover={(d) => alterarTreino((tr) => { tr.exercicios = mover(tr.exercicios, j, j + d); })}
              remover={() => alterarTreino((tr) => { tr.exercicios.splice(j, 1); })}
            />
          ))}
        </ol>

        <div className="flex gap-2">
          <input
            list="lista-exercicios"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionarExercicio())}
            placeholder="Digite para buscar na sua lista (ou um nome novo)"
            className="campo"
          />
          <button onClick={adicionarExercicio} disabled={!busca.trim()} className="botao shrink-0"><Plus className="size-4" /> Adicionar</button>
          <datalist id="lista-exercicios">
            {p.biblioteca.map((e) => <option key={e.id} value={e.nome}>{[e.grupo, e.equipamento].filter(Boolean).join(" · ")}</option>)}
          </datalist>
        </div>
        <label className="block"><span className="rotulo">Observações deste treino (o aluno vê)</span>
          <textarea rows={2} value={treino.observacoes ?? ""} onChange={(e) => alterarTreino((tr) => { tr.observacoes = e.target.value; })} className="campo mt-1" />
        </label>
      </section>

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-3 rounded-2xl md:bottom-3 border border-borda bg-cartao/95 p-3 shadow-lg backdrop-blur">
        <button onClick={salvar} disabled={pendente} className="botao">
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {novo ? "Salvar programa novo" : "Salvar"}
        </button>
        {msg?.erro && <p className="text-sm text-perigo">{msg.erro}</p>}
        {msg?.ok && <p className="text-sm text-ok">{msg.ok}</p>}
        {!msg && mudou && <p className="text-sm text-texto-suave">Alterações ainda não salvas.</p>}
      </div>
    </div>
  );
}

function LinhaExercicio(p: {
  e: ExercicioEditor;
  n: number;
  ultimo: boolean;
  ligadoAoAnterior: boolean;
  semanas: number;
  temVideo: boolean;
  alterar: (f: (e: ExercicioEditor) => void) => void;
  mover: (d: number) => void;
  remover: () => void;
}) {
  const { e } = p;
  const porSemana = e.prescricao.length > 1;
  const seg = e.metrica === "segundos";
  const campo = (i: number, k: keyof SemanaPrescrita) => (
    <input
      inputMode="numeric"
      value={e.prescricao[i]?.[k] ?? ""}
      onChange={(ev) => p.alterar((x) => { x.prescricao[i] = { ...x.prescricao[i], [k]: Number(ev.target.value.replace(/\D/g, "").slice(0, 3)) || 0 }; })}
      className="campo !px-2 !py-1.5 text-center"
      aria-label={k}
    />
  );

  return (
    <li className={`rounded-xl border p-3 ${p.ligadoAoAnterior || e.superset ? "border-marca/60" : "border-borda"} ${p.ligadoAoAnterior ? "-mt-1" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-marca-suave text-xs font-bold text-marca">{p.n}</span>
        <input value={e.nome} onChange={(ev) => p.alterar((x) => { x.nome = ev.target.value; x.exercicio_id = null; })} className="campo !py-1.5 font-semibold" aria-label="Nome do exercício" />
        {p.temVideo ? <Video className="size-4 shrink-0 text-marca" aria-label="Tem vídeo" /> : <span className="shrink-0 text-[10px] text-texto-suave">sem vídeo</span>}
        <button onClick={() => p.mover(-1)} className="text-texto-suave" aria-label="Subir"><ArrowUp className="size-4" /></button>
        <button onClick={() => p.mover(1)} className="text-texto-suave" aria-label="Descer"><ArrowDown className="size-4" /></button>
        <button onClick={p.remover} className="text-texto-suave" aria-label="Tirar exercício"><Trash2 className="size-4" /></button>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[20rem] text-xs">
          <thead className="text-texto-suave">
            <tr>
              {porSemana && <th className="w-14 text-left font-medium">Semana</th>}
              <th className="font-medium">Séries</th>
              <th className="font-medium">{seg ? "Seg. mín" : "Reps mín"}</th>
              <th className="font-medium">{seg ? "Seg. máx" : "Reps máx"}</th>
              <th className="font-medium">Pausa (s)</th>
            </tr>
          </thead>
          <tbody>
            {e.prescricao.map((_, i) => (
              <tr key={i}>
                {porSemana && <td className="pr-2 text-texto-suave">{i + 1}ª</td>}
                <td className="p-0.5">{campo(i, "series")}</td>
                <td className="p-0.5">{campo(i, "min")}</td>
                <td className="p-0.5">{campo(i, "max")}</td>
                <td className="p-0.5">{campo(i, "pausa")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={porSemana}
            onChange={(ev) => p.alterar((x) => { x.prescricao = ev.target.checked ? Array.from({ length: p.semanas }, () => ({ ...x.prescricao[0] })) : [x.prescricao[0]]; })}
          />
          Muda por semana do ciclo
        </label>
        <label className="flex items-center gap-1.5">
          Aquecimento
          <select value={e.aquecimento} onChange={(ev) => p.alterar((x) => { x.aquecimento = Number(ev.target.value); })} className="campo !w-auto !px-2 !py-1 text-xs">
            {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n ? `${n} série${n > 1 ? "s" : ""}` : "não"}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <select value={e.metrica} onChange={(ev) => p.alterar((x) => { x.metrica = ev.target.value as ExercicioEditor["metrica"]; })} className="campo !w-auto !px-2 !py-1 text-xs">
            <option value="reps">Repetições</option>
            <option value="segundos">Segundos</option>
          </select>
        </label>
        {!p.ultimo && (
          <label className={`flex items-center gap-1.5 ${e.superset ? "font-semibold text-marca" : ""}`}>
            <input type="checkbox" checked={e.superset} onChange={(ev) => p.alterar((x) => { x.superset = ev.target.checked; })} />
            <Link2 className="size-3.5" /> Superset com o próximo
          </label>
        )}
      </div>
      <input
        value={e.observacoes ?? ""}
        onChange={(ev) => p.alterar((x) => { x.observacoes = ev.target.value; })}
        placeholder="Observação para o aluno (opcional): técnica, cadência, ajuste da máquina…"
        className="campo mt-2 !py-1.5 text-xs"
      />
    </li>
  );
}
