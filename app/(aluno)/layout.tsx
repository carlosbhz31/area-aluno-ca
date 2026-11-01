import { redirect } from "next/navigation";
import { MenuAluno } from "@/components/menu-aluno";
import { exigirAluno } from "@/lib/sessao";
import { VERSAO_TERMOS } from "@/lib/termos";

export default async function LayoutAluno({ children }: { children: React.ReactNode }) {
  const s = await exigirAluno(); // professor e nutricionista vão para a própria área

  // Primeiro acesso (ou termos novos): aceitar antes de usar
  const { data: aluno } = await s.supabase.from("alunos").select("termos_versao").eq("user_id", s.user.id).maybeSingle();
  if (aluno && aluno.termos_versao !== VERSAO_TERMOS) redirect("/boas-vindas");

  return (
    <div className="min-h-dvh">
      <MenuAluno />
      <main className="pb-seguro px-4 pt-[max(1rem,env(safe-area-inset-top))] lg:ml-60 lg:px-10 lg:pb-10 lg:pt-8">{children}</main>
    </div>
  );
}
