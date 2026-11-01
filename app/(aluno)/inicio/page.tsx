import { UserX } from "lucide-react";
import { InicioAluno } from "@/components/inicio-aluno";
import { Vazio } from "@/components/ui";
import { carregarPainelAluno } from "@/lib/dados-aluno";
import { exigirAluno } from "@/lib/sessao";

export const metadata = { title: "Início · Área do Aluno CA" };

export default async function Inicio() {
  const s = await exigirAluno();
  const painel = await carregarPainelAluno(s.supabase, { userId: s.user.id });

  if (!painel) {
    return (
      <div className="mx-auto max-w-md pt-10">
        <Vazio icone={UserX} titulo="Seu acesso não está ativo">
          Pode ser que o cadastro esteja pausado ou ainda não ligado ao seu e-mail. Me chama no WhatsApp que eu resolvo.
        </Vazio>
      </div>
    );
  }

  return <InicioAluno painel={painel} />;
}
