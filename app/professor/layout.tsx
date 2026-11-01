import Image from "next/image";
import Link from "next/link";
import { CalendarClock, LogOut, Settings, Users, BarChart3 } from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";

const ITENS = [
  { href: "/professor/alunos", rotulo: "Alunos", icone: Users, pronto: true },
  { href: "#", rotulo: "Hoje", icone: CalendarClock, pronto: false },
  { href: "#", rotulo: "Supervisão", icone: BarChart3, pronto: false },
  { href: "#", rotulo: "Configurações", icone: Settings, pronto: false },
];

export default async function LayoutProfessor({ children }: { children: React.ReactNode }) {
  const s = await exigirProfessor();

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-menu px-3 py-6 text-menu-texto md:flex">
        <div className="mb-8 flex items-center gap-3 px-3">
          <Image src="/brand/ca-icone.png" alt="" width={38} height={38} />
          <div className="leading-tight">
            <p className="text-[10px] tracking-[0.25em] text-menu-texto/60">CONSULTORIA PREMIUM</p>
            <p className="font-bold text-white">Painel do Professor</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {ITENS.map(({ href, rotulo, icone: Icone, pronto }) =>
            pronto ? (
              <Link key={rotulo} href={href} className="flex items-center gap-3 rounded-xl bg-marca px-3 py-2.5 text-sm font-medium text-white">
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
        <div className="border-t border-white/10 px-3 pt-4 text-xs text-menu-texto/60">
          <p className="truncate">{s.user.email}</p>
          <form action="/auth/sair" method="post">
            <button className="mt-2 flex items-center gap-2 text-menu-texto hover:text-white"><LogOut className="size-4" /> Sair</button>
          </form>
        </div>
      </aside>

      {/* Barra simples para quando abrir no celular */}
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-menu px-4 py-3 text-white md:hidden">
        <Image src="/brand/ca-icone.png" alt="" width={28} height={28} />
        <Link href="/professor/alunos" className="font-bold">Painel do Professor</Link>
      </header>

      <main className="px-4 py-6 md:ml-64 md:px-10 md:py-8">{children}</main>
    </div>
  );
}
