import Image from "next/image";
import { FormularioEntrar } from "./formulario";

export const metadata = { title: "Entrar · Área do Aluno CA" };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="min-h-dvh bg-menu text-menu-texto flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-10">
          <Image src="/brand/ca-icone.png" alt="CA" width={88} height={88} priority />
          <p className="mt-4 text-xs tracking-[0.3em] text-menu-texto/70">CONSULTORIA PREMIUM</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Área do Aluno</h1>
        </div>
        <FormularioEntrar erroLink={erro === "link"} />
      </div>
    </main>
  );
}
