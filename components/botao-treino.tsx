"use client";

import { useEffect, useState } from "react";
import { Dumbbell, ExternalLink } from "lucide-react";
import type { LinksApp } from "@/lib/tipos";

// Escolhe o melhor link para o aparelho: link individual do aluno > loja do celular > site do app.
export function BotaoTreino({ app, linkIndividual, className = "" }: { app: LinksApp; linkIndividual: string | null; className?: string }) {
  const [href, setHref] = useState(linkIndividual || app.web);

  useEffect(() => {
    if (linkIndividual) return;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua) && app.ios) setHref(app.ios);
    else if (/Android/i.test(ua) && app.android) setHref(app.android);
  }, [app, linkIndividual]);

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`botao w-full !py-4 text-base ${className}`}>
      <Dumbbell className="size-5" />
      Abrir {app.nome}
      <ExternalLink className="size-4 opacity-70" />
    </a>
  );
}
