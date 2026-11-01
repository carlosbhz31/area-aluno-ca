"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Dumbbell, LineChart, Trophy, Menu } from "lucide-react";

const ITENS = [
  { href: "/inicio", rotulo: "Início", icone: Home },
  { href: "/treino", rotulo: "Treino", icone: Dumbbell },
  { href: "/acompanhamento", rotulo: "Acompanhamento", curto: "Check-in", icone: ClipboardList },
  { href: "/evolucao", rotulo: "Evolução", icone: LineChart, soComputador: true }, // no celular fica em "Mais"
  { href: "/conquistas", rotulo: "Conquistas", icone: Trophy },
  { href: "/mais", rotulo: "Mais", icone: Menu },
];

export function MenuAluno() {
  const caminho = usePathname();
  const ativo = (href: string) => caminho === href || caminho.startsWith(href + "/");

  return (
    <>
      {/* Computador: menu lateral escuro */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-menu px-3 py-6 text-menu-texto lg:flex">
        <div className="mb-8 flex items-center gap-3 px-3">
          <Image src="/brand/ca-icone.png" alt="" width={36} height={36} />
          <div className="leading-tight">
            <p className="text-[10px] tracking-[0.25em] text-menu-texto/60">CONSULTORIA</p>
            <p className="font-bold text-white">Área do Aluno</p>
          </div>
        </div>
        <nav className="space-y-1">
          {ITENS.map(({ href, rotulo, icone: Icone }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${ativo(href) ? "bg-marca text-white" : "hover:bg-menu-item"}`}
            >
              <Icone className="size-5" /> {rotulo}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Celular: barra inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-menu pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid grid-cols-5">
          {ITENS.filter((i) => !i.soComputador).map(({ href, rotulo, curto, icone: Icone }) => (
            <li key={href}>
              <Link href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${ativo(href) ? "text-white" : "text-menu-texto/55"}`}>
                <span className={`grid h-7 w-12 place-items-center rounded-full ${ativo(href) ? "bg-marca" : ""}`}>
                  <Icone className="size-5" />
                </span>
                {curto ?? rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
