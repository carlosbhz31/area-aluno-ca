"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarClock, Dumbbell, PlayCircle, Settings, Users } from "lucide-react";

const ITENS_BASE = [
  { href: "/professor/hoje", rotulo: "Hoje", icone: CalendarClock },
  { href: "/professor/alunos", rotulo: "Alunos", icone: Users },
  { href: "/professor/exercicios", rotulo: "Exercícios", icone: Dumbbell },
  { href: "/professor/configuracoes", rotulo: "Configurações", icone: Settings },
  { href: null, rotulo: "Supervisão", icone: BarChart3 },
];

/** meuTreino: o professor também é aluno e treina pelo app (atalho para a área do aluno). */
export function MenuProfessor({ celular = false, meuTreino = false }: { celular?: boolean; meuTreino?: boolean }) {
  const caminho = usePathname();
  const ITENS = meuTreino ? [...ITENS_BASE, { href: "/treino", rotulo: "Meu treino", icone: PlayCircle }] : ITENS_BASE;
  const ativo = (href: string) => caminho === href || caminho.startsWith(href + "/");

  if (celular) {
    return (
      <nav className="flex gap-1 overflow-x-auto">
        {ITENS.filter((i) => i.href).map(({ href, rotulo }) => (
          <Link key={rotulo} href={href!} className={`rounded-lg px-3 py-1.5 text-sm ${ativo(href!) ? "bg-marca text-white" : "text-menu-texto/70"}`}>
            {rotulo}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex-1 space-y-1">
      {ITENS.map(({ href, rotulo, icone: Icone }) =>
        href ? (
          <Link
            key={rotulo}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${ativo(href) ? "bg-marca text-white" : "hover:bg-menu-item"}`}
          >
            <Icone className="size-5" /> {rotulo}
          </Link>
        ) : (
          <span key={rotulo} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-menu-texto/40">
            <Icone className="size-5" /> {rotulo}
            <span className="ml-auto text-[10px] uppercase tracking-wider">em breve</span>
          </span>
        ),
      )}
    </nav>
  );
}
