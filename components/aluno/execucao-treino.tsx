"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, Flag, Loader2, MessageCircle, Minus, Music, Play, Plus, SkipForward, Square, Timer, Trash2, Video, Volume2, VolumeX, X } from "lucide-react";
import { linkWhatsapp } from "@/lib/formato";
import { agendarPipMisturado, cancelarPipMisturado, iniciarSomPausa, type ModoPip } from "@/lib/som-pausa";
import { ajustarPausa, concluirTreino, descartarTreino, desmarcarSerie, marcarSerie } from "@/app/(aluno)/treino/acoes";
import { AtivarAvisos } from "./ativar-avisos";
import { VideoSobreposto } from "./video-sobreposto";
import { Barra } from "../ui";
import { alvo, blocos, comUnidade, ESFORCOS, numero, UNIDADES, unidadeValida, videoYoutube, chaveSerie, pausaDepois, proximaSerie, seriesDoPlano, tempo, textoProxima, type ExercicioPlano, type SerieChave, type UltimaVez, type Unidade } from "@/lib/treino";

export type SerieSalva = { exercicio_id: string; numero: number; aquecimento: boolean; carga: number | null; reps: number | null; segundos: number | null; unidade?: string | null };

type Valor = { carga: string; reps: string };
const br = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

/** Selo da linha recolhida: a série mais pesada da última vez ("92,5 kg · 8 reps"). */
function melhorDaUltima(ult: UltimaVez, e: ExercicioPlano) {
  const s = [...ult.series].sort((a, b) => (b.carga ?? 0) - (a.carga ?? 0))[0];
  if (!s) return "";
  const qtd = e.metrica === "segundos" ? `${s.segundos ?? "-"} s` : `${s.reps ?? "-"} reps`;
  return s.carga != null ? `${comUnidade(s.carga, s.unidade)} · ${qtd}` : qtd;
}

/** Cronômetro da série de exercício em segundos (prancha etc.): é diferente da pausa. */
type Crono = { s: SerieChave; e: ExercicioPlano; fim: number; total: number };

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
  /** WhatsApp do Carlos e primeiro nome do aluno, para o botão de mandar vídeo de correção. */
  whatsapp: string | null;
  primeiroNome: string;
  /** Prévia do professor ("Ver como o aluno"): tudo funciona na tela, mas nada é salvo nem avisado. */
  previa?: { voltar: string };
}) {
  const previa = p.previa;
  const { execucaoId, plano } = p;
  const chaveLocal = `ca-treino-${execucaoId}`;

  /** Os campos começam vazios: nada é preenchido pelo aluno. A carga da última vez aparece só como
   *  dica em cinza (ver dicaCarga); se repetiu, é só marcar que a dica vale. */
  const vazio = useMemo(() => {
    const v: Record<string, Valor> = {};
    for (const s of seriesDoPlano(plano)) v[chaveSerie(s)] = { carga: "", reps: "" };
    return v;
  }, [plano]);

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
  // Pip do fim da pausa. Padrão: por cima da música, sem pausar. Quem quer o pip até com a tela
  // bloqueada escolhe o modo "bloqueada" (aí o celular pausa a música). Ver lib/som-pausa.
  const som = useRef<HTMLAudioElement | null>(null);
  const [modoPip, setModoPip] = useState<ModoPip>("desligado"); // padrão: o bip para a música dos alunos
  const tocou = useRef(true);
  const [video, setVideo] = useState<{ url: string; titulo: string } | null>(null);
  const fecharVideo = useCallback(() => setVideo(null), []);

  const [feitas, setFeitas] = useState(() => new Set(p.feitas.map((f) => chaveSerie({ exercicioId: f.exercicio_id, numero: f.numero, aquecimento: f.aquecimento }))));
  const [valores, setValores] = useState<Record<string, Valor>>(() => {
    const v = { ...vazio };
    for (const f of p.feitas) {
      const segundos = plano.find((e) => e.id === f.exercicio_id)?.metrica === "segundos";
      v[chaveSerie({ exercicioId: f.exercicio_id, numero: f.numero, aquecimento: f.aquecimento })] = { carga: br(f.carga), reps: br(segundos ? f.segundos : f.reps) };
    }
    return v;
  });
  // Unidade da carga em cada exercício (kg, lb ou barras): a de hoje, senão a da última vez
  const [unidades, setUnidades] = useState<Record<string, Unidade>>(() => {
    const u: Record<string, Unidade> = {};
    for (const e of plano) u[e.id] = unidadeValida(p.feitas.find((f) => f.exercicio_id === e.id && !f.aquecimento)?.unidade ?? p.ultimaVez[e.id]?.series[0]?.unidade);
    return u;
  });
  const [crono, setCrono] = useState<Crono | null>(null);
  // Exercício que acabou de ser concluído: mostra o ✅ um instante antes de ir para o próximo
  const [recemConcluido, setRecemConcluido] = useState<string | null>(null);

  /** Dica da carga (cinza): a da última vez nessa mesma série; se não tem, a da série anterior de hoje. */
  function dicaCarga(e: ExercicioPlano, s: SerieChave) {
    if (s.aquecimento) return "";
    const ant = p.ultimaVez[e.id]?.porSerie[s.numero]?.carga;
    if (ant != null) return br(ant);
    for (let n = s.numero - 1; n >= 1; n--) {
      const c = valores[chaveSerie({ exercicioId: e.id, numero: n, aquecimento: false })]?.carga;
      if (c) return c;
    }
    return "";
  }
  const [obsAbertas, setObsAbertas] = useState<Set<string>>(new Set());
  const [dicaVideo, setDicaVideo] = useState(false);
  const zap = (e: ExercicioPlano) => linkWhatsapp(p.whatsapp, `Oi Carlos, aqui é ${p.primeiroNome}! Segue o vídeo do ${e.nome} pra você corrigir a execução 🎥`);

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
      const modo = localStorage.getItem("ca-pip-modo");
      if (modo === "musica") setModoPip("musica");
      else if (modo === "bloqueada") setModoPip("bloqueada");
      const salvo = JSON.parse(localStorage.getItem(chaveLocal) ?? "null") as Record<string, Valor> | null;
      if (salvo) {
        setValores((v) => {
          const n = { ...v };
          // só o que o aluno digitou e ainda não marcou (o servidor vale para as séries feitas)
          for (const [k, x] of Object.entries(salvo)) if (n[k] && (x.carga || x.reps)) n[k] = { carga: x.carga || n[k].carga, reps: x.reps || n[k].reps };
          return n;
        });
      }
      if (p.whatsapp && localStorage.getItem(`ca-dica-video-${execucaoId}`) !== "0") setDicaVideo(true);
    } catch {
      // sem armazenamento local: segue com o que veio do servidor
    }
  }, [p.agoraServidor, p.pausaAte, p.whatsapp, chaveLocal, execucaoId]);

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
  function tocarPip(segundos: number, modo = modoPip) {
    const el = som.current;
    if (!el) return;
    iniciarSomPausa(el, segundos, modo).catch(() => {
      // aparelho não deixou tocar: o push avisa
    });
    try {
      if (modo === "bloqueada" && segundos > 0 && "mediaSession" in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: "Pausa do treino", artist: "Consultoria Premium CA" });
    } catch {
      // ignora
    }
  }

  function alternarSom() {
    const novo: ModoPip = modoPip === "musica" ? "bloqueada" : modoPip === "bloqueada" ? "desligado" : "musica";
    setModoPip(novo);
    try {
      localStorage.setItem("ca-pip-modo", novo === "desligado" ? "0" : novo);
    } catch {
      // ignora
    }
    tocarPip(pausaFim && !aviso ? (pausaFim - Date.now()) / 1000 : 0, novo);
  }

  // Modo "música": com a tela bloqueada o navegador congela o som agendado; ao voltar, reagenda
  // para o tempo que falta (ou cancela, para não tocar atrasado). Ao sair da tela, cancela.
  const fimRef = useRef(pausaFim);
  fimRef.current = aviso ? null : pausaFim;
  useEffect(() => {
    if (modoPip !== "musica") return;
    const mudou = () => {
      const fim = fimRef.current;
      if (document.visibilityState === "visible" && fim && fim > Date.now()) agendarPipMisturado((fim - Date.now()) / 1000);
      else cancelarPipMisturado();
    };
    document.addEventListener("visibilitychange", mudou);
    return () => {
      document.removeEventListener("visibilitychange", mudou);
      cancelarPipMisturado();
    };
  }, [modoPip]);

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
  }, [pausaFim, restante, modoPip]);

  const todas = useMemo(() => seriesDoPlano(plano), [plano]);
  const feitasValidas = todas.filter((s) => !s.aquecimento && feitas.has(chaveSerie(s))).length;
  const totalValidas = todas.filter((s) => !s.aquecimento).length;
  const proximaGeral = todas.find((s) => !feitas.has(chaveSerie(s)));

  // Só um exercício aberto por vez (no superset, o bloco todo): o que o aluno escolheu ou o próximo da ordem
  const listaBlocos = useMemo(() => blocos(plano), [plano]);
  const blocoDe = (id: string | null | undefined) => listaBlocos.find((b) => b.some((x) => x.id === id)) ?? [];
  const [aberto, setAberto] = useState<string | null>(null);
  const blocoAberto = blocoDe(aberto ?? proximaGeral?.exercicioId);
  const inicioAberto = blocoAberto[0]?.id ?? null;
  const abertoAntes = useRef(inicioAberto);
  useEffect(() => {
    if (inicioAberto && abertoAntes.current !== inicioAberto) document.getElementById(`ex-${inicioAberto}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    abertoAntes.current = inicioAberto;
  }, [inicioAberto]);

  function iniciarPausaLocal(fimServidor: string | undefined, agoraServ: string | undefined, segundos: number) {
    if (agoraServ) desvio.current = Date.parse(agoraServ) - Date.now();
    if (!segundos) return;
    const fim = fimServidor ? Date.parse(fimServidor) - desvio.current : Date.now() + segundos * 1000;
    tocou.current = false;
    setAviso(null);
    setPausaFim(fim);
    setPausaTotal(segundos);
  }

  async function alternar(s: SerieChave, e: ExercicioPlano, extra?: Partial<Valor>) {
    const k = chaveSerie(s);
    if (salvando.has(k)) return;
    setErro(null);
    setSalvando((x) => new Set(x).add(k));
    const fim = () => setSalvando((x) => { const n = new Set(x); n.delete(k); return n; });

    if (feitas.has(k)) {
      setFeitas((x) => { const n = new Set(x); n.delete(k); return n; });
      if (!previa) await desmarcarSerie(execucaoId, s.exercicioId, s.numero, s.aquecimento).catch(() => setErro("Não consegui desmarcar. Confere a internet."));
      return fim();
    }

    const novas = new Set(feitas).add(k);
    setFeitas(novas);
    // Campo vazio = usou a dica (carga da última vez) e a meta de reps/segundos
    const v = { ...(valores[k] ?? { carga: "", reps: "" }), ...extra };
    if (!v.carga) v.carga = dicaCarga(e, s);
    if (!v.reps && (e.max || e.min)) v.reps = String(e.max || e.min);
    setValores((x) => ({ ...x, [k]: v }));
    // Terminou o exercício (ou o superset inteiro): mostra o ✅ um instante e só depois desce
    // devagar para o próximo (para a pessoa entender o que aconteceu)
    const doBloco = new Set(blocoDe(e.id).map((x) => x.id));
    const acabou = todas.every((x) => !doBloco.has(x.exercicioId) || novas.has(chaveSerie(x)));
    setAberto(e.id);
    if (acabou) {
      setRecemConcluido(e.id);
      setTimeout(() => {
        setRecemConcluido((r) => (r === e.id ? null : r));
        setAberto((a) => (a === e.id ? null : a));
      }, 1600);
    }
    const prox = proximaSerie(plano, novas, s);
    const pausa = pausaDepois(plano, s, prox);
    iniciarPausaLocal(undefined, undefined, pausa); // já começa a contar; o servidor confirma em seguida
    if (previa) {
      if (!prox) setFinalizando(true);
      return fim();
    }
    tocarPip(pausa);
    try {
      const r = await marcarSerie({
        execucaoId,
        exercicioId: s.exercicioId,
        numero: s.numero,
        aquecimento: s.aquecimento,
        carga: v.carga,
        unidade: unidades[e.id],
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
    if (previa) return;
    const r = await ajustarPausa(seg).catch(() => null);
    if (r?.terminaEm && seg !== "pular") iniciarPausaLocal(r.terminaEm, r.agora, Math.max(3, pausaTotal + seg));
  }

  /** Começa a contar a série em segundos (no toque, para o pip poder tocar no fim). */
  function iniciarCrono(s: SerieChave, e: ExercicioPlano) {
    const total = Math.round(numero(valores[chaveSerie(s)]?.reps, 3600) ?? (e.max || e.min || 30));
    if (pausaFim) mudarPausa("pular"); // começou a série: a pausa acabou
    setCrono({ s, e, total, fim: Date.now() + total * 1000 });
    if (modoPip !== "desligado") agendarPipMisturado(total);
  }

  /** Parou antes: guarda os segundos que fez; o aluno confere e marca. */
  function pararCrono() {
    if (!crono) return;
    const feitos = Math.max(1, Math.round(crono.total - (crono.fim - Date.now()) / 1000));
    setValores((x) => ({ ...x, [chaveSerie(crono.s)]: { ...(x[chaveSerie(crono.s)] ?? { carga: "" }), reps: String(Math.min(feitos, crono.total)) } }));
    setCrono(null);
    cancelarPipMisturado();
  }

  // Tempo da série acabou: vibra, registra os segundos e marca a série (aí começa a pausa)
  useEffect(() => {
    if (!crono || agora < crono.fim) return;
    const c = crono;
    setCrono(null);
    navigator.vibrate?.([300, 120, 300]);
    if (!feitas.has(chaveSerie(c.s))) void alternar(c.s, c.e, { reps: String(c.total) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agora, crono]);

  const minutos = Math.floor((agora + desvio.current - Date.parse(p.iniciadaEm)) / 60000);

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-32 pt-2">
      <div className="flex items-start gap-3">
        <Link href={previa?.voltar ?? "/treino"} className="botao-secundario !p-2" aria-label="Voltar"><ArrowLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight">{p.nome}</h1>
          <p className="text-sm text-texto-suave">
            {p.semana ? `Semana ${p.semana} · ` : ""}
            {feitasValidas} de {totalValidas} séries · {minutos >= 0 && minutos < 600 ? `${minutos} min` : ""}
          </p>
        </div>
      </div>
      <Barra valor={totalValidas ? feitasValidas / totalValidas : 0} />

      {previa ? (
        <p className="rounded-xl bg-marca-suave px-3 py-2 text-xs text-marca">Prévia: pode tocar em tudo. Nada é salvo e nenhum aviso é enviado ao aluno.</p>
      ) : (
        <AtivarAvisos compacto />
      )}
      {erro && <p className="cartao border-perigo/40 bg-perigo-suave p-3 text-sm text-perigo">{erro}</p>}
      {dicaVideo && (
        <div className="flex items-start gap-2 rounded-xl bg-marca-suave px-3 py-2 text-xs text-marca">
          <Video className="mt-0.5 size-4 shrink-0" />
          <p className="flex-1">Grava uma série de algum exercício e me manda pra eu corrigir a execução. É só tocar em <b>Enviar meu vídeo para correção</b> no exercício.</p>
          <button
            onClick={() => {
              setDicaVideo(false);
              try {
                localStorage.setItem(`ca-dica-video-${execucaoId}`, "0");
              } catch {
                // ignora
              }
            }}
            aria-label="Fechar dica"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {plano.map((e, i) => {
        const ult = p.ultimaVez[e.id];
        const series = todas.filter((s) => s.exercicioId === e.id);
        const feitasDoEx = series.filter((s) => !s.aquecimento && feitas.has(chaveSerie(s))).length;
        const completo = series.every((s) => feitas.has(chaveSerie(s)));
        const proximaDoEx = series.find((s) => !feitas.has(chaveSerie(s)));
        const bloco = blocoDe(e.id);
        const parceiros = bloco.filter((x) => x.id !== e.id).map((x) => x.nome);
        const marca = (
          <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${completo ? "bg-ok text-white" : "bg-marca-suave text-marca"}`}>
            {completo ? <Check className="size-4" /> : i + 1}
          </span>
        );

        // Recolhido: uma linha com o essencial; toca para abrir
        if (!blocoAberto.some((x) => x.id === e.id)) {
          return (
            <button key={e.id} id={`ex-${e.id}`} onClick={() => setAberto(e.id)} className={`cartao flex w-full scroll-mt-4 items-center gap-3 p-3 text-left ${completo ? "opacity-70" : ""}`}>
              {marca}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{e.nome}</span>
                {parceiros.length > 0 && <span className="block truncate text-[11px] font-semibold text-marca">Superset com {parceiros.join(" e ")}</span>}
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
            {parceiros.length > 0 && (
              <p className="mb-2 inline-block rounded-full bg-marca px-2.5 py-0.5 text-xs font-semibold text-white">
                Superset · alterne com {parceiros.join(" e ")}, sem pausa entre eles
              </p>
            )}
            <div className="flex items-start gap-3">
              {marca}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold leading-snug">{e.nome}</h2>
                <p className="text-sm text-texto-suave">
                  {e.series} × {alvo(e)}{e.metrica === "reps" ? " reps" : ""} · {e.superset ? "sem pausa" : `pausa ${tempo(e.pausa)}`}
                  {e.equipamento ? ` · ${e.equipamento}` : ""}
                </p>
                {ult && (
                  <p className="mt-1 text-xs text-texto-suave">
                    Última vez: {ult.series.map((s) => `${s.carga != null ? `${comUnidade(s.carga, s.unidade)} × ` : ""}${e.metrica === "segundos" ? `${s.segundos ?? "-"} s` : s.reps ?? "-"}`).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            {e.video_url && (videoYoutube(e.video_url) ? (
              <button onClick={() => setVideo({ url: e.video_url!, titulo: e.nome })} className="botao-secundario mt-3 w-full !py-2 text-sm">
                <Video className="size-4" /> Ver vídeo do exercício
              </button>
            ) : (
              // link que não é do YouTube: abre fora, como antes
              <a href={e.video_url} target="_blank" rel="noopener noreferrer" className="botao-secundario mt-3 w-full !py-2 text-sm">
                <Video className="size-4" /> Ver vídeo do exercício
              </a>
            ))}
            {zap(e) && (
              <a href={zap(e)!} target="_blank" rel="noopener noreferrer" className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-sm font-semibold text-marca">
                <MessageCircle className="size-4" /> Enviar meu vídeo para correção
              </a>
            )}
            {e.observacoes && (() => {
              // Observação longa fica recolhida em 2 linhas; toca para ver tudo
              const longa = e.observacoes.length > 90 || e.observacoes.includes("\n");
              const aberta = obsAbertas.has(e.id);
              return (
                <button
                  type="button"
                  onClick={() => longa && setObsAbertas((x) => { const n = new Set(x); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; })}
                  className="mt-2 block w-full rounded-lg bg-fundo p-2 text-left text-sm"
                >
                  <span className={`block whitespace-pre-line ${longa && !aberta ? "line-clamp-2" : ""}`}>{e.observacoes}</span>
                  {longa && <span className="mt-0.5 block text-xs font-semibold text-marca">{aberta ? "Ver menos" : "Ver mais"}</span>}
                </button>
              );
            })()}

            {e.aquecimento > 0 && (
              <p className="mt-2 text-xs text-texto-suave">
                <b>Aq</b> = série de aquecimento: leve, só para preparar. Não conta nas séries principais.
              </p>
            )}

            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-texto-suave">
                <span>Série</span>
                <button
                  type="button"
                  onClick={() => setUnidades((u) => ({ ...u, [e.id]: UNIDADES[(UNIDADES.indexOf(u[e.id] ?? "kg") + 1) % UNIDADES.length] }))}
                  className="flex items-center gap-0.5 text-left uppercase text-marca"
                  aria-label={`Unidade da carga: ${unidades[e.id] ?? "kg"}. Toque para trocar`}
                >
                  Carga ({unidades[e.id] ?? "kg"}) <ChevronDown className="size-3" />
                </button>
                <span>{e.metrica === "segundos" ? "Segundos" : "Reps"}</span><span />
              </div>
              {series.map((s) => {
                const k = chaveSerie(s);
                const v = valores[k] ?? { carga: "", reps: "" };
                const feita = feitas.has(k);
                const mudar = (campo: keyof Valor) => (ev: React.ChangeEvent<HTMLInputElement>) =>
                  setValores((x) => ({ ...x, [k]: { ...v, [campo]: ev.target.value.replace(/[^\d.,]/g, "").slice(0, 6) } }));
                return (
                  <div key={k} className={`grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2 rounded-xl p-1 ${feita ? "bg-ok-suave" : ""}`}>
                    <span className={`text-sm font-semibold ${s.aquecimento ? "text-texto-suave" : ""}`}>{s.aquecimento ? `Aq ${s.numero}` : s.numero}</span>
                    <input className="campo !px-2 !py-2 text-center" inputMode="decimal" placeholder={dicaCarga(e, s) || unidades[e.id] || "kg"} value={v.carga} onChange={mudar("carga")} disabled={feita} aria-label={`Carga da série ${s.numero}`} />
                    <input className="campo !px-2 !py-2 text-center" inputMode="numeric" placeholder={alvo(e).replace(" s", "")} value={v.reps} onChange={mudar("reps")} disabled={feita} aria-label={`${e.metrica === "segundos" ? "Segundos" : "Repetições"} da série ${s.numero}`} />
                    <button
                      onClick={() => alternar(s, e)}
                      className={`grid size-11 place-items-center rounded-xl border-2 transition-colors ${feita ? "border-ok bg-ok text-white" : "border-borda bg-cartao text-texto-suave"}`}
                      aria-label={feita ? "Desmarcar série" : "Marcar série feita"}
                    >
                      {salvando.has(k) ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
                    </button>
                  </div>
                );
              })}
            </div>
            {/* Exercício em segundos: cronômetro da série (separado da pausa) */}
            {e.metrica === "segundos" && (crono?.e.id === e.id ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-marca p-3 text-white">
                <Timer className="size-6 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold tabular-nums leading-none">{tempo(Math.ceil(Math.max(0, (crono.fim - agora) / 1000)))}</p>
                  <p className="text-xs text-white/80">{crono.s.aquecimento ? `Aquecimento ${crono.s.numero}` : `Série ${crono.s.numero}`} · marca sozinho no fim</p>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/25"><div className="h-full bg-white" style={{ width: `${Math.min(100, ((crono.fim - agora) / 1000 / crono.total) * 100)}%` }} /></div>
                </div>
                <button onClick={pararCrono} className="flex items-center gap-1 rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold"><Square className="size-4" /> Parar</button>
              </div>
            ) : proximaDoEx && !crono && (
              <button onClick={() => iniciarCrono(proximaDoEx, e)} className="botao mt-3 w-full !py-3">
                <Play className="size-5" /> Iniciar cronômetro · {proximaDoEx.aquecimento ? `aquec. ${proximaDoEx.numero}` : `série ${proximaDoEx.numero}`} ({Math.round(numero(valores[chaveSerie(proximaDoEx)]?.reps, 3600) ?? (e.max || e.min || 30))} s)
              </button>
            ))}
            {recemConcluido === e.id && completo && (
              <p className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-ok-suave py-3 font-semibold text-ok">
                ✅ Exercício concluído! Indo para o próximo…
              </p>
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
            <p className="mb-2 text-sm text-texto-suave">Quanto puxado foi?</p>
            <div className="grid grid-cols-4 gap-2">
              {ESFORCOS.map((x) => (
                <button key={x.valor} onClick={() => setEsforco(x.valor)} className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-xs font-semibold ${esforco === x.valor ? "border-marca bg-marca text-white" : "border-borda"}`}>
                  <span className="text-3xl leading-none">{x.emoji}</span>
                  {x.rotulo}
                </button>
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
              if (previa) return void setEnviando(false);
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
        className={`mx-auto flex items-center gap-1 text-xs text-texto-suave ${previa ? "hidden" : ""}`}
      >
        <Trash2 className="size-3.5" /> Descartar treino
      </button>

      {(pausaFim || aviso) && (
        <div className={previa ? "sticky bottom-3 z-30" : "fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 px-4 lg:bottom-6 lg:left-60"}>
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
              {modoPip === "musica" ? <><Music className="size-3.5" /> Pip no fim, sem pausar a música · toca para mudar</> : modoPip === "bloqueada" ? <><Volume2 className="size-3.5" /> Pip até com a tela bloqueada · pausa a música</> : <><VolumeX className="size-3.5" /> Pip desligado · só a notificação</>}
            </button>
          )}
        </div>
      )}
      <audio ref={som} playsInline preload="none" />
      {video && <VideoSobreposto url={video.url} titulo={video.titulo} fechar={fecharVideo} />}
    </div>
  );
}
