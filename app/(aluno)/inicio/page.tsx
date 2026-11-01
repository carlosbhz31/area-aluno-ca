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
        <Vazio icone={UserX} titulo="Não achei seu cadastro">
          Seu login funcionou, mas o cadastro ainda não está ligado a ele. Me chama no WhatsApp que eu resolvo.
        </Vazio>
      </div>
    );
  }

  return <InicioAluno painel={painel} />;
}
