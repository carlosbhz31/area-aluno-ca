import { redirect } from "next/navigation";
import { MenuAluno } from "@/components/menu-aluno";
import { exigirAluno } from "@/lib/sessao";

export default async function LayoutAluno({ children }: { children: React.ReactNode }) {
  const s = await exigirAluno();
  if (s.papel === "professor") redirect("/professor/hoje");

  return (
    <div className="min-h-dvh">
      <MenuAluno />
      <main className="pb-seguro px-4 pt-[max(1rem,env(safe-area-inset-top))] lg:ml-60 lg:px-10 lg:pb-10 lg:pt-8">{children}</main>
    </div>
  );
}
