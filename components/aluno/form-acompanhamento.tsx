"use client";

import { useActionState, useState } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { enviarAcompanhamento } from "@/app/(aluno)/acoes";
import { ESCALA } from "@/lib/acompanhamento";

function Escala({ nome, rotulo }: { nome: string; rotulo: string }) {
  const [valor, setValor] = useState<number | null>(null);
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">{rotulo}</legend>
      <input type="hidden" name={nome} value={valor ?? ""} />
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValor(n)}
            className={`rounded-xl border py-2.5 text-center text-xs font-semibold transition ${
              valor === n ? "border-marca bg-marca text-white" : "border-borda bg-cartao text-texto-suave"
            }`}
          >
            <span className="block text-lg">{n}</span>
            {ESCALA[n]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Contador({ nome, rotulo, inicial = 0 }: { nome: string; rotulo: string; inicial?: number }) {
  const [v, setV] = useState(inicial);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold">{rotulo}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setV(Math.max(0, v - 1))} className="grid size-10 place-items-center rounded-xl border border-borda text-xl">−</button>
        <input name={nome} value={v} readOnly className="w-10 bg-transparent text-center text-xl font-bold" />
        <button type="button" onClick={() => setV(Math.min(14, v + 1))} className="grid size-10 place-items-center rounded-xl border border-borda text-xl">+</button>
      </div>
    </div>
  );
}

export function FormAcompanhamento({ semana }: { semana: number | null }) {
  const [estado, enviar, pendente] = useActionState(enviarAcompanhamento, undefined);
  const [dor, setDor] = useState(false);

  if (estado?.ok) {
    return (
      <div className="cartao flex flex-col items-center p-8 text-center">
        <CheckCircle2 className="size-12 text-ok" />
        <p className="mt-3 text-lg font-bold">{estado.ok}</p>
        <p className="mt-1 text-sm text-texto-suave">Quando eu responder, aparece aqui e no Início.</p>
      </div>
    );
  }

  return (
    <form action={enviar} className="space-y-4">
      <section className="cartao space-y-4 p-5">
        <p className="rotulo">{semana ? `Semana ${semana} do ciclo` : "Como foi a semana"}</p>
        <Contador nome="treinos_planejados" rotulo="Treinos planejados" inicial={4} />
        <Contador nome="treinos_feitos" rotulo="Treinos feitos" />
        <Contador nome="cardio_vezes" rotulo="Cardio (vezes)" />
      </section>

      <section className="cartao space-y-5 p-5">
        <Escala nome="aderencia" rotulo="Seguiu o plano (treino e alimentação)?" />
        <Escala nome="sono" rotulo="Como dormiu?" />
        <Escala nome="energia" rotulo="Energia no dia a dia" />
      </section>

      <section className="cartao space-y-4 p-5">
        <fieldset>
          <legend className="mb-2 font-semibold">Sentiu alguma dor?</legend>
          <input type="hidden" name="dor" value={dor ? "sim" : "nao"} />
          <div className="grid grid-cols-2 gap-2">
            {[false, true].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setDor(v)}
                className={`rounded-xl border py-2.5 font-semibold ${dor === v ? "border-marca bg-marca text-white" : "border-borda text-texto-suave"}`}
              >
                {v ? "Sim" : "Não"}
              </button>
            ))}
          </div>
          {dor && <input name="dor_onde" placeholder="Onde e quando? Ex.: ombro no supino" className="campo mt-2" />}
        </fieldset>
        <label className="block">
          <span className="font-semibold">Bateu alguma carga nova?</span>
          <input name="recorde" placeholder="Ex.: agachamento 60 kg (opcional)" className="campo mt-2" />
        </label>
        <label className="block">
          <span className="font-semibold">Dúvidas ou recado pra mim</span>
          <textarea name="duvidas" rows={3} placeholder="Opcional" className="campo mt-2" />
        </label>
      </section>

      {estado?.erro && <p className="text-sm font-semibold text-perigo">{estado.erro}</p>}
      <button className="botao w-full !py-4 text-base" disabled={pendente}>
        {pendente ? <Loader2 className="size-5 animate-spin" /> : <><Send className="size-5" /> Enviar acompanhamento</>}
      </button>
    </form>
  );
}
