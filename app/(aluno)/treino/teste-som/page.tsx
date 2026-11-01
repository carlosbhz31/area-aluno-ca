"use client";

// Página temporária para descobrir, no iPhone, qual jeito de tocar o pip funciona com a tela bloqueada e com música.

import { useEffect, useRef, useState } from "react";
import { definirModoAudio, pararPausa, tocarPausa, type ModoAudio } from "@/lib/som-pausa";

const VARIANTES: { modo: ModoAudio; nome: string }[] = [
  { modo: "ambient", nome: "A – mistura com a música" },
  { modo: "transient", nome: "B – abaixa a música um instante" },
  { modo: "auto", nome: "C – padrão do iPhone" },
];

export default function TesteSom() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState("");
  const [temSessao, setTemSessao] = useState<boolean | null>(null);

  useEffect(() => {
    setTemSessao("audioSession" in navigator);
  }, []);

  async function testar(modo: ModoAudio, nome: string, segundos: number) {
    const el = audio.current!;
    pararPausa(el);
    definirModoAudio(modo);
    try {
      await tocarPausa(el, segundos);
      setStatus(`${nome}: pip em ${segundos} s. Bloqueie a tela agora.`);
    } catch (e) {
      setStatus(`${nome}: o aparelho não deixou tocar (${(e as Error).name}).`);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 py-4">
      <h1 className="text-2xl font-bold">Teste do som da pausa</h1>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-white/80">
        <li>Coloque uma música para tocar (Spotify, Apple Music…).</li>
        <li>Volte aqui e toque numa variante.</li>
        <li>Bloqueie a tela na hora e espere 15 s.</li>
        <li>Anote: tocou o pip? A música continuou?</li>
      </ol>
      {VARIANTES.map((v) => (
        <div key={v.modo} className="cartao space-y-2 p-4">
          <p className="font-semibold">{v.nome}</p>
          <div className="flex gap-2">
            <button className="botao flex-1 !py-2 text-sm" onClick={() => testar(v.modo, v.nome, 15)}>Pip em 15 s</button>
            <button className="botao-secundario flex-1 !py-2 text-sm" onClick={() => testar(v.modo, v.nome, 0)}>Ouvir agora</button>
          </div>
        </div>
      ))}
      <button className="botao-secundario w-full text-sm" onClick={() => { pararPausa(audio.current!); setStatus("Parado."); }}>Parar</button>
      {status && <p className="cartao p-3 text-sm">{status}</p>}
      {temSessao === false && <p className="text-xs text-white/60">Este aparelho não tem controle de modo de áudio: as três variantes vão soar iguais.</p>}
      <audio ref={audio} playsInline preload="none" />
    </div>
  );
}
