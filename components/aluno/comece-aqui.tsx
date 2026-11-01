"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Check, ChevronRight, Loader2, Rocket } from "lucide-react";
import { marcarAppTreino } from "@/app/(aluno)/acoes";
import type { LinksApp } from "@/lib/tipos";
import { Barra } from "../ui";
import { BotaoTreino } from "../botao-treino";

type Props = {
  anamnese: "nenhuma" | "rascunho" | "feita";
  broches: string[];
  app: LinksApp | null;
  linkApp: string | null;
  preview?: boolean;
};

/** Primeiro acesso guiado. Some quando todos os passos estão feitos. */
export function ComeceAqui({ anamnese, broches, app, linkApp, preview = false }: Props) {
  const [salvando, iniciar] = useTransition();
  const tem = (b: string) => broches.includes(b);

  const passos: { id: string; titulo: string; feito: boolean; conteudo?: React.ReactNode }[] = [
    { id: "termos", titulo: "Aceitar os termos", feito: true },
    {
      id: "anamnese",
      titulo: "Preencher a anamnese",
      feito: anamnese === "feita",
      conteudo: (
        <>
          <p>Uns 15 minutos. Dá para parar e continuar depois: cada etapa fica salva.</p>
          <Link href="/anamnese" className="botao mt-3 !py-2 text-sm">
            {anamnese === "rascunho" ? "Continuar a anamnese" : "Começar a anamnese"} <ChevronRight className="size-4" />
          </Link>
        </>
      ),
    },
    ...(app
      ? [{
          id: "app",
          titulo: `Instalar o ${app.nome}`,
          feito: tem("app_treino"),
          conteudo: (
            <>
              <p>É lá que fica seu treino. Instala e entra com o mesmo e-mail.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <BotaoTreino app={app} linkIndividual={linkApp} className="!w-auto !py-2 text-sm" />
                <button
                  type="button"
                  disabled={salvando || preview}
                  onClick={() => iniciar(() => marcarAppTreino())}
                  className="botao-secundario !py-2 text-sm"
                >
                  {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Já instalei
                </button>
              </div>
            </>
          ),
        }]
      : []),
    {
      id: "atalho",
      titulo: "Colocar este app na tela inicial",
      feito: tem("app_instalado"),
      conteudo: (
        <div className="space-y-1">
          <p><strong>iPhone (Safari):</strong> Compartilhar → Adicionar à Tela de Início.</p>
          <p><strong>Android (Chrome):</strong> três pontinhos → Instalar app.</p>
          <p className="text-texto-suave">Depois abre pelo ícone novo: o passo marca sozinho.</p>
        </div>
      ),
    },
    {
      id: "avisos",
      titulo: "Ativar os avisos",
      feito: tem("avisos_ligados"),
      conteudo: <p>Abre pelo ícone da tela inicial e toca em <strong>Ativar avisos</strong> (aqui no Início ou em Mais).</p>,
    },
  ];

  const feitos = passos.filter((p) => p.feito).length;
  if (feitos === passos.length) return null;
  const atual = passos.find((p) => !p.feito)!;

  return (
    <section className="cartao p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold"><Rocket className="size-5 text-marca" /> Comece aqui</h2>
        <span className="text-sm font-semibold text-texto-suave">{feitos} de {passos.length}</span>
      </div>
      <Barra valor={feitos / passos.length} className="mt-3" />
      <p className="mt-2 text-xs text-texto-suave">Cada passo vale uma conquista.</p>

      <ol className="mt-4 space-y-2">
        {passos.map((p, i) => (
          <li key={p.id} className={`rounded-xl border p-3 ${p === atual ? "border-marca/40 bg-marca-suave/40" : "border-borda"}`}>
            <p className="flex items-center gap-3 font-semibold">
              <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${p.feito ? "bg-ok text-white" : p === atual ? "bg-marca text-white" : "bg-borda text-texto-suave"}`}>
                {p.feito ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={p.feito ? "text-texto-suave line-through" : ""}>{p.titulo}</span>
            </p>
            {!p.feito && p.conteudo && <div className="mt-2 pl-9 text-sm">{p.conteudo}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}
