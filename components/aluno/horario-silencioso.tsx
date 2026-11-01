"use client";

import { useState, useTransition } from "react";
import { Moon } from "lucide-react";
import { salvarSilencio } from "@/app/(aluno)/acoes";

const HORAS = Array.from({ length: 24 }, (_, h) => h);

export function HorarioSilencioso({ inicio, fim }: { inicio: number; fim: number }) {
  const [de, setDe] = useState(inicio);
  const [ate, setAte] = useState(fim);
  const [salvo, setSalvo] = useState(false);
  const [pendente, iniciar] = useTransition();

  function mudar(novoDe: number, novoAte: number) {
    setDe(novoDe);
    setAte(novoAte);
    setSalvo(false);
    iniciar(async () => {
      await salvarSilencio(novoDe, novoAte);
      setSalvo(true);
    });
  }

  return (
    <section className="cartao p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Moon className="size-5 text-marca" /> Horário silencioso</h2>
      <p className="mt-1 text-sm text-texto-suave">Nesse intervalo não chega aviso no celular. Fica tudo guardado no app.</p>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span>De</span>
        <select value={de} onChange={(e) => mudar(Number(e.target.value), ate)} className="campo !w-24">
          {HORAS.map((h) => <option key={h} value={h}>{h}h</option>)}
        </select>
        <span>até</span>
        <select value={ate} onChange={(e) => mudar(de, Number(e.target.value))} className="campo !w-24">
          {HORAS.map((h) => <option key={h} value={h}>{h}h</option>)}
        </select>
        <span className="text-xs text-texto-suave">{pendente ? "salvando…" : salvo ? "salvo" : ""}</span>
      </div>
    </section>
  );
}
