"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, Check, CloudCheck, Loader2, X } from "lucide-react";
import { concluirAnamnese, salvarEtapaAnamnese } from "@/app/(aluno)/acoes";
import { etapasDo, faltando, visivel, type Pergunta, type RespostasAnamnese, type RespostasEtapa, type TipoAnamnese } from "@/lib/anamnese";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { Barra } from "../ui";
import { reduzir } from "./form-evolucao";

type Props = {
  alunoId: string;
  anamneseId: string | null;
  tipo: TipoAnamnese;
  respostas: RespostasAnamnese;
  etapaInicial: number;
  fotos: Record<string, string>; // caminho → link temporário das fotos já enviadas
};

export function FormAnamnese({ alunoId, anamneseId, tipo, respostas: iniciais, etapaInicial, fotos: fotosIniciais }: Props) {
  const router = useRouter();
  const etapas = etapasDo(tipo);
  const [id, setId] = useState(anamneseId);
  const [i, setI] = useState(Math.max(0, etapaInicial));
  const [respostas, setRespostas] = useState<RespostasAnamnese>(iniciais);
  const [fotos, setFotos] = useState(fotosIniciais);
  const [erros, setErros] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvoEm, setSalvoEm] = useState<number | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const etapa = etapas[i];
  const r = respostas[etapa.id] ?? {};
  const ultima = i === etapas.length - 1;

  const mudar = (pergunta: string, valor: string | string[]) => {
    setRespostas((todas) => ({ ...todas, [etapa.id]: { ...(todas[etapa.id] ?? {}), [pergunta]: valor } }));
    setErros((e) => e.filter((x) => x !== pergunta));
  };

  async function salvar(): Promise<string | null> {
    const res = await salvarEtapaAnamnese(id, etapa.id, r);
    if (res.erro) {
      setAviso(res.erro);
      return null;
    }
    setId(res.id!);
    setSalvoEm(Date.now());
    return res.id!;
  }

  function avancar() {
    const falta = faltando(etapa, r).map((p) => p.id);
    setErros(falta);
    if (falta.length) {
      setAviso("Faltou responder o que está marcado.");
      document.getElementById(`p-${falta[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setAviso(null);
    iniciar(async () => {
      const salvoId = await salvar();
      if (!salvoId) return;
      if (ultima) {
        const fim = await concluirAnamnese(salvoId);
        if (fim.erro) return setAviso(fim.erro);
        router.push("/anamnese?enviada=1");
        router.refresh();
        return;
      }
      setI(i + 1);
      window.scrollTo({ top: 0 });
    });
  }

  function voltar() {
    iniciar(async () => {
      await salvar(); // guarda o que já foi preenchido, mesmo incompleto
      setAviso(null);
      setErros([]);
      setI(i - 1);
      window.scrollTo({ top: 0 });
    });
  }

  async function enviarFotos(p: Pergunta, arquivos: FileList | null) {
    if (!arquivos?.length) return;
    const atuais = (r[p.id] as string[] | undefined) ?? [];
    const livres = (p.max ?? 4) - atuais.length;
    setEnviandoFoto(p.id);
    const supabase = clienteNavegador();
    const novos: string[] = [];
    const links: Record<string, string> = {};
    for (const arquivo of Array.from(arquivos).slice(0, livres)) {
      const caminho = `${alunoId}/anamnese/${Date.now()}-${novos.length}.jpg`;
      const { error } = await supabase.storage.from("fotos").upload(caminho, await reduzir(arquivo), { contentType: "image/jpeg" });
      if (error) {
        setAviso("Não consegui enviar uma das fotos. Confere a internet e tenta de novo.");
        continue;
      }
      novos.push(caminho);
      links[caminho] = URL.createObjectURL(arquivo);
    }
    setFotos((f) => ({ ...f, ...links }));
    mudar(p.id, [...atuais, ...novos]);
    setEnviandoFoto(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-marca">Etapa {i + 1} de {etapas.length}</span>
          {salvoEm && <span className="flex items-center gap-1 text-xs text-texto-suave"><CloudCheck className="size-3.5" /> Salvo</span>}
        </div>
        <Barra valor={(i + 1) / etapas.length} className="mt-2" />
      </div>

      <section className="cartao space-y-6 p-5">
        <header>
          <h2 className="text-xl font-bold">{etapa.titulo}</h2>
          <p className="mt-1 text-sm text-texto-suave">{etapa.texto}</p>
        </header>

        {etapa.perguntas.filter((p) => visivel(p, r)).map((p) => (
          <div key={p.id} id={`p-${p.id}`} className={erros.includes(p.id) ? "rounded-xl ring-2 ring-perigo/60 ring-offset-4 ring-offset-cartao" : ""}>
            <p className="font-semibold">
              {p.texto} {p.obrigatoria && <span className="text-perigo">*</span>}
            </p>
            {p.ajuda && <p className="mt-0.5 text-xs text-texto-suave">{p.ajuda}</p>}
            <div className="mt-2">
              <Campo p={p} r={r} mudar={mudar} fotos={fotos} enviando={enviandoFoto === p.id} enviarFotos={enviarFotos} />
            </div>
          </div>
        ))}
      </section>

      {aviso && <p className="text-sm font-semibold text-perigo">{aviso}</p>}

      <div className="flex gap-2 pb-4">
        {i > 0 && (
          <button type="button" onClick={voltar} disabled={pendente} className="botao-secundario">
            <ArrowLeft className="size-4" /> Voltar
          </button>
        )}
        <button type="button" onClick={avancar} disabled={pendente || !!enviandoFoto} className="botao flex-1 !py-3.5">
          {pendente ? <Loader2 className="size-4 animate-spin" /> : ultima ? <><Check className="size-4" /> Enviar anamnese</> : <>Próxima <ArrowRight className="size-4" /></>}
        </button>
      </div>
    </div>
  );
}

function Campo({
  p, r, mudar, fotos, enviando, enviarFotos,
}: {
  p: Pergunta;
  r: RespostasEtapa;
  mudar: (id: string, v: string | string[]) => void;
  fotos: Record<string, string>;
  enviando: boolean;
  enviarFotos: (p: Pergunta, a: FileList | null) => void;
}) {
  const v = r[p.id];
  const texto = typeof v === "string" ? v : "";
  const lista = Array.isArray(v) ? v : [];

  switch (p.tipo) {
    case "longo":
      return <textarea rows={4} value={texto} onChange={(e) => mudar(p.id, e.target.value)} placeholder={p.placeholder} maxLength={3000} className="campo" />;
    case "data":
      return <input type="date" value={texto} onChange={(e) => mudar(p.id, e.target.value)} className="campo" />;
    case "numero":
      return <input inputMode="decimal" value={texto} onChange={(e) => mudar(p.id, e.target.value)} placeholder={p.placeholder} className="campo max-w-40" />;
    case "escala":
      return (
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 10 }, (_, k) => String(k + 1)).map((n) => (
            <button key={n} type="button" onClick={() => mudar(p.id, n)} aria-pressed={texto === n}
              className={`rounded-lg py-2.5 text-sm font-bold transition ${texto === n ? "bg-marca text-white" : "bg-fundo ring-1 ring-borda"}`}>
              {n}
            </button>
          ))}
        </div>
      );
    case "opcao":
    case "multipla": {
      const multipla = p.tipo === "multipla";
      const exclusiva = (o: string) => /^(Não sinto dor|Nada disso)$/.test(o);
      const cheio = !!p.max && lista.length >= p.max;
      return (
        <div className="flex flex-wrap gap-2">
          {p.opcoes!.map((o) => {
            const marcado = multipla ? lista.includes(o) : texto === o;
            return (
              <button key={o} type="button" aria-pressed={marcado} disabled={multipla && !marcado && cheio}
                onClick={() => {
                  if (!multipla) return mudar(p.id, o);
                  if (marcado) return mudar(p.id, lista.filter((x) => x !== o));
                  mudar(p.id, exclusiva(o) ? [o] : [...lista.filter((x) => !exclusiva(x)), o]);
                }}
                className={`rounded-full px-3.5 py-2 text-left text-sm font-semibold transition disabled:opacity-40 ${marcado ? "bg-marca text-white" : "bg-fundo ring-1 ring-borda"}`}>
                {o}
              </button>
            );
          })}
          {p.max && multipla && <p className="w-full text-xs text-texto-suave">{lista.length} de {p.max}</p>}
        </div>
      );
    }
    case "fotos":
      return (
        <div className="grid grid-cols-4 gap-2">
          {lista.map((caminho) => (
            <div key={caminho} className="relative aspect-square overflow-hidden rounded-xl bg-fundo ring-1 ring-borda">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {fotos[caminho] && <img src={fotos[caminho]} alt="" className="size-full object-cover" />}
              <button type="button" onClick={() => mudar(p.id, lista.filter((x) => x !== caminho))} aria-label="Tirar foto"
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {lista.length < (p.max ?? 4) && (
            <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-borda bg-fundo text-xs text-texto-suave">
              {enviando ? <Loader2 className="size-5 animate-spin" /> : <span className="flex flex-col items-center gap-1"><Camera className="size-5" />Adicionar</span>}
              <input type="file" accept="image/*" multiple className="sr-only" disabled={enviando} onChange={(e) => enviarFotos(p, e.target.files)} />
            </label>
          )}
        </div>
      );
    default:
      return <input value={texto} onChange={(e) => mudar(p.id, e.target.value)} placeholder={p.placeholder} maxLength={300} className="campo" />;
  }
}
