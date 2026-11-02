import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { exigirProfessor, professorTambemAluno } from "@/lib/sessao";
import { MenuProfessor } from "@/components/professor/menu-professor";

export default async function LayoutProfessor({ children }: { children: React.ReactNode }) {
  const s = await exigirProfessor();
  const meuTreino = await professorTambemAluno();

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
        <MenuProfessor meuTreino={meuTreino} />
        <div className="border-t border-white/10 px-3 pt-4 text-xs text-menu-texto/60">
          <p className="truncate">{s.user.email}</p>
          <form action="/auth/sair" method="post">
            <button className="mt-2 flex items-center gap-2 text-menu-texto hover:text-white"><LogOut className="size-4" /> Sair</button>
          </form>
        </div>
      </aside>

      {/* Celular: barra fina em cima e o menu embaixo, ao alcance do polegar */}
      {/* pt com safe-area: no app instalado do iPhone a barra ficava embaixo do relógio e não dava para tocar */}
      <header className="flex items-center gap-3 bg-menu px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-white md:hidden">
        <Image src="/brand/ca-icone.png" alt="" width={26} height={26} />
        <Link href="/professor/hoje" className="font-bold">Painel do Professor</Link>
        <form action="/auth/sair" method="post" className="ml-auto">
          <button className="flex items-center gap-1 text-sm text-menu-texto hover:text-white"><LogOut className="size-4" /> Sair</button>
        </form>
      </header>
      <MenuProfessor celular meuTreino={meuTreino} />

      <main className="px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 md:ml-64 md:px-10 md:py-8">{children}</main>
    </div>
  );
}
