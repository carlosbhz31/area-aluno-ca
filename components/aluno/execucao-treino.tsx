"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Flag, Loader2, Minus, Plus, SkipForward, Timer, Trash2, Video, Volume2, VolumeX } from "lucide-react";
import { pararPausa, tocarPausa } from "@/lib/som-pausa";
import { ajustarPausa, concluirTreino, descartarTreino, desmarcarSerie, marcarSerie } from "@/app/(aluno)/treino/acoes";
import { AtivarAvisos } from "./ativar-avisos";
import { Barra } from "../ui";
import { alvo, chaveSerie, proximaSerie, seriesDoPlano, tempo, textoProxima, type ExercicioPlano, type SerieChave } from "@/lib/treino";

export type SerieSalva = { exercicio_id: string; numero: number; aquecimento: boolean; carga: number | null; reps: number | null; segundos: number | null };
export type UltimaVez = { data: string; execucaoId: string; series: { numero: number; carga: number | null; reps: number | null; segundos: number | null }[] };

type Valor = { carga: string; reps: string };
const br = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

/** Selo da linha recolhida: a série mais pesada da última vez ("92,5 kg · 8 reps"). */
function melhorDaUltima(ult: UltimaVez, e: ExercicioPlano) {
  const s = [...ult.series].sort((a, b) => (b.carga ?? 0) - (a.carga ?? 0))[0];
  if (!s) return "";
  const qtd = e.metrica === "segundos" ? `${s.segundos ?? "-"} s` : `${s.reps ?? "-"} reps`;
  return s.carga != null ? `${br(s.carga)} kg · ${qtd}` : qtd;
}

/** Execução do treino: marca séries, guarda carga e reps e cuida da pausa.
 *  O cronômetro da tela é só visual; quem garante o aviso com a tela bloqueada é o servidor (push). */
export function ExecucaoTreino(p: {
  execucaoId: string;
  nome: string;
  semana: number | null;
  iniciadaEm: string;
  plano: ExercicioPlano[];
  feitas: SerieSalva[];
  ultimaVez: Record<string, UltimaVez>;
  pausaAte: string | null;
  agoraServidor: string;
}) {
  const { execucaoId, plano } = p;
  const chaveLocal = `ca-treino-${execucaoId}`;

  /** Série sem carga herda a da série anterior do mesmo exercício. */
  const repetirCarga = (v: Record<string, Valor>) => {
    const salvas = new Set(p.feitas.map((f) => chaveSerie({ exercicioId: f.exercicio_id, numero: f.numero, aquecimento: f.aquecimento })));
    for (const e of plano) {
      let anterior = "";
      for (let n = 1; n <= e.series; n++) {
        const k = chaveSerie({ exercicioId: e.id, numero: n, aquecimento: false });
        if (v[k] && !v[k].carga && anterior && !salvas.has(k)) v[k] = { ...v[k], carga: anterior };
        anterior = v[k]?.carga || anterior;
      }
    }
    return v;
  };

  // Diferença entre o relógio do servidor e o do celular (para o cronômetro bater com o aviso)
  const desvio = useRef(0);
  const [pausaFim, setPausaFim] = useState<number | null>(null);
  const [pausaTotal, setPausaTotal] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<Set<string>>(new Set());
  const [finalizando, setFinalizando] = useState(false);
  const [esforco, setEsforco] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Pip do fim da pausa: um áudio (silêncio + pip) que segue tocando com a tela bloqueada.
  // No iPhone ele pausa a música da pessoa, por isso dá para desligar.
  const som = useRef<HTMLAudioElement | null>(null);
  const [comSom, setComSom] = useState(true);
  const tocou = useRef(true);

  const [feitas, setFeitas] = useState(() => new Set(p.feitas.map((f) => chaveSerie({ exercicioId: f.exercicio_id, numero: f.numero, aquecimento: f.aquecimento }))));
  const [valores, setValores] = useState<Record<string, Valor>>(() => {
    const v: Record<string, Valor> = {};
    for (const e of plano) {
      const ant = p.ultimaVez[e.id]?.series ?? [];
      for (let n = 1; n <= e.series; n++) {
        const a = ant.find((x) => x.numero === n) ?? ant[ant.length - 1];
        v[chaveSerie({ exercicioId: e.id, numero: n, aquecimento: false })] = { carga: br(a?.carga), reps: "" };
      }
      for (let n = 1; n <= e.aquecimento; n++) v[chaveSerie({ exercicioId: e.id, numero: n, aquecimento: true })] = { carga: "", reps: "" };
    }
    for (const f of p.feitas) {
      const segundos = plano.find((e) => e.id === f.exercicio_id)?.metrica === "segundos";
      v[chaveSerie({ exercicioId: f.exercicio_id, numero: f.numero, aquecimento: f.aquecimento })] = { carga: br(f.carga), reps: br(segundos ? f.segundos : f.reps) };
    }
    return repetirCarga(v);
  });

  // Pausa que já estava correndo quando a tela abriu (voltou do bloqueio, recarregou)
  useEffect(() => {
    desvio.current = Date.parse(p.agoraServidor) - Date.now();
    if (p.pausaAte) {
      const fim = Date.parse(p.pausaAte) - desvio.current;
      if (fim > Date.now()) {
        setPausaFim(fim);
        setPausaTotal(Math.round((fim - Date.now()) / 1000));
        tocou.current = false;
      }
    }
    try {
      if (localStorage.getItem("ca-pip-pausa") === "0") setComSom(false);
      const salvo = JSON.parse(localStorage.getItem(chaveLocal) ?? "null") as Record<string, Valor> | null;
      if (salvo) {
        setValores((v) => {
          const n = { ...v };
          // só o que o aluno digitou e ainda não marcou (o servidor vale para as séries feitas)
          for (const [k, x] of Object.entries(salvo)) if (n[k] && (x.carga || x.reps)) n[k] = { carga: x.carga || n[k].carga, reps: x.reps || n[k].reps };
          return repetirCarga(n);
        });
      }
    } catch {
      // sem armazenamento local: segue com o que veio do servidor
    }
  }, [p.agoraServidor, p.pausaAte, chaveLocal]);

  useEffect(() => {
    try {
      localStorage.setItem(chaveLocal, JSON.stringify(valores));
    } catch {
      // ignora
    }
  }, [valores, chaveLocal]);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  /** Só funciona dentro de um toque da pessoa (regra dos celulares para tocar áudio). */
  function tocarPip(segundos: number, ligado = comSom) {
    const el = som.current;
    if (!el) return;
    if (!ligado || segundos <= 0) return pararPausa(el);
    tocarPausa(el, segundos).catch(() => {
      // aparelho não deixou tocar: o push avisa
    });
    try {
      if ("mediaSession" in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: "Pausa do treino", artist: "Consultoria Premium CA" });
    } catch {
      // ignora
    }
  }

  function alternarSom() {
    const novo = !comSom;
    setComSom(novo);
    try {
      localStorage.setItem("ca-pip-pausa", novo ? "1" : "0");
    } catch {
      // ignora
    }
    tocarPip(pausaFim && !aviso ? (pausaFim - Date.now()) / 1000 : 0, novo);
  }

  const restante = pausaFim ? Math.max(0, (pausaFim - agora) / 1000) : 0;
  useEffect(() => {
    if (pausaFim && restante <= 0 && !tocou.current) {
      tocou.current = true;
      if (document.visibilityState === "visible") navigator.vibrate?.([300, 120, 300, 120, 300]);
      setAviso("Pausa acabou. Bora!");
      const t = setTimeout(() => {
        setPausaFim(null);
        setAviso(null);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [pausaFim, restante]);

  const todas = useMemo(() => seriesDoPlano(plano), [plano]);
  const feitasValidas = todas.filter((s) => !s.aquecimento && feitas.has(chaveSerie(s))).length;
  const totalValidas = todas.filter((s) => !s.aquecimento).length;
  const proximaGeral = todas.find((s) => !feitas.has(chaveSerie(s)));

  // Só um exercício aberto por vez: o que o aluno escolheu ou, se nenhum, o próximo da ordem
  const [aberto, setAberto] = useState<string | null>(null);
  const abertoId = aberto ?? proximaGeral?.exercicioId ?? null;
  const abertoAntes = useRef(abertoId);
  useEffect(() => {
    if (abertoId && abertoAntes.current !== abertoId) document.getElementById(`ex-${abertoId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    abertoAntes.current = abertoId;
  }, [abertoId]);

  function iniciarPausaLocal(fimServidor: string | undefined, agoraServ: string | undefined, segundos: number) {
    if (agoraServ) desvio.current = Date.parse(agoraServ) - Date.now();
    if (!segundos) return;
    const fim = fimServidor ? Date.parse(fimServidor) - desvio.current : Date.now() + segundos * 1000;
    tocou.current = false;
    setAviso(null);
    setPausaFim(fim);
    setPausaTotal(segundos);
  }

  async function alternar(s: SerieChave, e: ExercicioPlano) {
    const k = chaveSerie(s);
    if (salvando.has(k)) return;
    setErro(null);
    setSalvando((x) => new Set(x).add(k));
    const fim = () => setSalvando((x) => { const n = new Set(x); n.delete(k); return n; });

    if (feitas.has(k)) {
      setFeitas((x) => { const n = new Set(x); n.delete(k); return n; });
      await desmarcarSerie(execucaoId, s.exercicioId, s.numero, s.aquecimento).catch(() => setErro("Não consegui desmarcar. Confere a internet."));
      return fim();
    }

    const novas = new Set(feitas).add(k);
    setFeitas(novas);
    // Terminou o exercício: abre o próximo da ordem; senão continua neste
    const acabou = todas.every((x) => x.exercicioId !== e.id || novas.has(chaveSerie(x)));
    setAberto(acabou ? null : e.id);
    // A carga usada passa para as próximas séries do exercício (o aluno só muda se trocar o peso)
    const cargaUsada = valores[k]?.carga;
    if (cargaUsada && !s.aquecimento) {
      setValores((x) => {
        const n = { ...x };
        for (let i = s.numero + 1; i <= e.series; i++) {
          const kk = chaveSerie({ exercicioId: e.id, numero: i, aquecimento: false });
          if (!novas.has(kk)) n[kk] = { ...(n[kk] ?? { reps: "" }), carga: cargaUsada };
        }
        return n;
      });
    }
    const prox = proximaSerie(plano, novas, s);
    const pausa = s.aquecimento || !prox ? 0 : e.pausa;
    iniciarPausaLocal(undefined, undefined, pausa); // já começa a contar; o servidor confirma em seguida
    tocarPip(pausa);
    const v = valores[k] ?? { carga: "", reps: "" };
    try {
      const r = await marcarSerie({
        execucaoId,
        exercicioId: s.exercicioId,
        numero: s.numero,
        aquecimento: s.aquecimento,
        carga: v.carga,
        reps: e.metrica === "reps" ? v.reps || e.max || e.min : null,
        segundos: e.metrica === "segundos" ? v.reps || e.max || e.min : null,
        pausa,
        proximo: textoProxima(plano, prox),
      });
      if (r.erro) setErro(r.erro);
      if (r.terminaEm) iniciarPausaLocal(r.terminaEm, r.agora, pausa);
      if (!prox) setFinalizando(true);
    } catch {
      setFeitas((x) => { const n = new Set(x); n.delete(k); return n; });
      setErro("Sem internet: a série não foi salva e o aviso da pausa não vai tocar com a tela bloqueada.");
    }
    fim();
  }

  async function mudarPausa(seg: number | "pular") {
    if (seg === "pular") {
      setPausaFim(null);
      setAviso(null);
      tocou.current = true;
      tocarPip(0);
    } else if (pausaFim) {
      const fim = Math.max(Date.now() + 3000, pausaFim + seg * 1000);
      setPausaFim(fim);
      setPausaTotal((t) => Math.max(3, t + seg));
      tocarPip((fim - Date.now()) / 1000);
    }
    const r = await ajustarPausa(seg).catch(() => null);
    if (r?.terminaEm && seg !== "pular") iniciarPausaLocal(r.terminaEm, r.agora, Math.max(3, pausaTotal + seg));
  }

  const minutos = Math.floor((agora + desvio.current - Date.parse(p.iniciadaEm)) / 60000);

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-32 pt-2">
      <div className="flex items-start gap-3">
        <Link href="/treino" className="botao-secundario !p-2" aria-label="Voltar"><ArrowLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight">{p.nome}</h1>
          <p className="text-sm text-texto-suave">
            {p.semana ? `Semana ${p.semana} · ` : ""}
            {feitasValidas} de {totalValidas} séries · {minutos >= 0 && minutos < 600 ? `${minutos} min` : ""}
          </p>
        </div>
      </div>
      <Barra valor={totalValidas ? feitasValidas / totalValidas : 0} />

      <AtivarAvisos compacto />
      {erro && <p className="cartao border-perigo/40 bg-perigo-suave p-3 text-sm text-perigo">{erro}</p>}

      {plano.map((e, i) => {
        const ult = p.ultimaVez[e.id];
        const series = todas.filter((s) => s.exercicioId === e.id);
        const feitasDoEx = series.filter((s) => !s.aquecimento && feitas.has(chaveSerie(s))).length;
        const completo = series.every((s) => feitas.has(chaveSerie(s)));
        const proximaDoEx = series.find((s) => !feitas.has(chaveSerie(s)));
        const marca = (
          <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${completo ? "bg-ok text-white" : "bg-marca-suave text-marca"}`}>
            {completo ? <Check className="size-4" /> : i + 1}
          </span>
        );

        // Recolhido: uma linha com o essencial; toca para abrir
        if (e.id !== abertoId) {
          return (
            <button key={e.id} id={`ex-${e.id}`} onClick={() => setAberto(e.id)} className={`cartao flex w-full scroll-mt-4 items-center gap-3 p-3 text-left ${completo ? "opacity-70" : ""}`}>
              {marca}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{e.nome}</span>
                <span className="block text-xs text-texto-suave">
                  {completo ? "Feito" : feitasDoEx ? `${feitasDoEx} de ${e.series} séries` : `${e.series} × ${alvo(e)}${e.metrica === "reps" ? " reps" : ""}`}
                </span>
              </span>
              {ult && !completo && <span className="shrink-0 rounded-full bg-marca-suave px-2.5 py-1 text-xs font-semibold text-marca">{melhorDaUltima(ult, e)}</span>}
            </button>
          );
        }

        return (
          <section key={e.id} id={`ex-${e.id}`} className="cartao scroll-mt-4 border-marca p-4">
            <div className="flex items-start gap-3">
              {marca}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold leading-snug">{e.nome}</h2>
                <p className="text-sm text-texto-suave">
                  {e.series} × {alvo(e)}{e.metrica === "reps" ? " reps" : ""} · pausa {tempo(e.pausa)}
                  {e.equipamento ? ` · ${e.equipamento}` : ""}
                </p>
                {ult && (
                  <p className="mt-1 text-xs text-texto-suave">
                    Última vez: {ult.series.map((s) => `${s.carga != null ? `${br(s.carga)} kg × ` : ""}${e.metrica === "segundos" ? `${s.segundos ?? "-"} s` : s.reps ?? "-"}`).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            {e.video_url && (
              <a href={e.video_url} target="_blank" rel="noopener noreferrer" className="botao-secundario mt-3 w-full !py-2 text-sm">
                <Video className="size-4" /> Ver vídeo do exercício
              </a>
            )}
            {e.observacoes && <p className="mt-2 whitespace-pre-line rounded-lg bg-fundo p-2 text-sm">{e.observacoes}</p>}

            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-[3.5rem_1fr_1fr_3rem] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-texto-suave">
                <span>Série</span><span>Carga (kg)</span><span>{e.metrica === "segundos" ? "Segundos" : "Reps"}</span><span />
              </div>
              {series.map((s) => {
                const k = chaveSerie(s);
                const v = valores[k] ?? { carga: "", reps: "" };
                const feita = feitas.has(k);
                const mudar = (campo: keyof Valor) => (ev: React.ChangeEvent<HTMLInputElement>) =>
                  setValores((x) => ({ ...x, [k]: { ...v, [campo]: ev.target.value.replace(/[^\d.,]/g, "").slice(0, 6) } }));
                return (
                  <div key={k} className={`grid grid-cols-[3.5rem_1fr_1fr_3rem] items-center gap-2 rounded-xl p-1 ${feita ? "bg-ok-suave" : ""}`}>
                    <span className={`text-sm font-semibold ${s.aquecimento ? "text-texto-suave" : ""}`}>{s.aquecimento ? `Aq ${s.numero}` : s.numero}</span>
                    <input className="campo !px-2 !py-2 text-center" inputMode="decimal" placeholder="kg" value={v.carga} onChange={mudar("carga")} disabled={feita} aria-label={`Carga da série ${s.numero}`} />
                    <input className="campo !px-2 !py-2 text-center" inputMode="numeric" placeholder={alvo(e).replace(" s", "")} value={v.reps} onChange={mudar("reps")} disabled={feita} aria-label={`${e.metrica === "segundos" ? "Segundos" : "Repetições"} da série ${s.numero}`} />
                    <button
                      onClick={() => alternar(s, e)}
                      className={`grid size-11 place-items-center rounded-xl border-2 ${feita ? "border-ok bg-ok text-white" : "border-borda bg-cartao text-texto-suave"}`}
                      aria-label={feita ? "Desmarcar série" : "Marcar série feita"}
                    >
                      {salvando.has(k) ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
                    </button>
                  </div>
                );
              })}
            </div>
            {proximaDoEx && (
              <button onClick={() => alternar(proximaDoEx, e)} disabled={salvando.has(chaveSerie(proximaDoEx))} className="botao mt-3 w-full !py-3.5 text-base">
                <Check className="size-5" /> Concluir {proximaDoEx.aquecimento ? `aquecimento ${proximaDoEx.numero}` : `série ${proximaDoEx.numero}`}
              </button>
            )}
          </section>
        );
      })}

      {!finalizando ? (
        <button onClick={() => setFinalizando(true)} className="botao w-full !py-4"><Flag className="size-5" /> Concluir treino</button>
      ) : (
        <section className="cartao space-y-4 p-5">
          <h2 className="font-semibold">Como foi o treino?</h2>
          <div>
            <p className="mb-2 text-sm text-texto-suave">Esforço de 1 (leve) a 10 (máximo)</p>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setEsforco(n)} className={`rounded-xl border py-2 font-semibold ${esforco === n ? "border-marca bg-marca text-white" : "border-borda"}`}>{n}</button>
              ))}
            </div>
          </div>
          <form
            action={async (f) => {
              setEnviando(true);
              try {
                localStorage.removeItem(chaveLocal);
              } catch {
                // ignora
              }
              await concluirTreino(execucaoId, esforco, String(f.get("comentario") ?? ""));
            }}
            className="space-y-3"
          >
            <textarea name="comentario" rows={3} className="campo" placeholder="Algum recado para o Carlos? (dor, máquina ocupada, recorde...)" />
            <button className="botao w-full" disabled={enviando}>{enviando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Salvar e concluir</button>
          </form>
          {feitasValidas < totalValidas && <p className="text-center text-xs text-texto-suave">Faltam {totalValidas - feitasValidas} séries. Pode concluir assim mesmo.</p>}
        </section>
      )}

      <button
        onClick={() => {
          if (confirm("Descartar este treino? As séries marcadas hoje serão apagadas.")) descartarTreino(execucaoId);
        }}
        className="mx-auto flex items-center gap-1 text-xs text-texto-suave"
      >
        <Trash2 className="size-3.5" /> Descartar treino
      </button>

      {(pausaFim || aviso) && (
        <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 px-4 lg:bottom-6 lg:left-60">
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-menu p-3 text-white shadow-xl">
            <Timer className={`size-6 shrink-0 ${aviso ? "text-ok" : "text-white/70"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold tabular-nums leading-none">{aviso ? "0 s" : tempo(Math.ceil(restante))}</p>
              <p className="truncate text-xs text-white/70">{aviso ?? "Pausa · te aviso quando acabar"}</p>
              {!aviso && <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-white/80" style={{ width: `${pausaTotal ? Math.min(100, (restante / pausaTotal) * 100) : 0}%` }} /></div>}
            </div>
            {!aviso && (
              <>
                <button onClick={() => mudarPausa(-15)} className="grid size-10 place-items-center rounded-xl bg-white/10" aria-label="Menos 15 segundos"><Minus className="size-4" /></button>
                <button onClick={() => mudarPausa(15)} className="grid size-10 place-items-center rounded-xl bg-white/10" aria-label="Mais 15 segundos"><Plus className="size-4" /></button>
              </>
            )}
            <button onClick={() => mudarPausa("pular")} className="grid size-10 place-items-center rounded-xl bg-white/10" aria-label="Pular pausa"><SkipForward className="size-4" /></button>
          </div>
          {!aviso && (
            <button onClick={alternarSom} className="mx-auto mt-1 flex max-w-xl items-center gap-1 rounded-full bg-menu/90 px-3 py-1 text-[11px] text-white/80">
              {comSom ? <><Volume2 className="size-3.5" /> Pip ligado · pausa a sua música</> : <><VolumeX className="size-3.5" /> Pip desligado · só a notificação</>}
            </button>
          )}
        </div>
      )}
      <audio ref={som} playsInline preload="none" />
    </div>
  );
}
