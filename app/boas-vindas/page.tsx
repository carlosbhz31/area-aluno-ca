import Image from "next/image";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { exigirAluno } from "@/lib/sessao";
import { primeiroNome } from "@/lib/formato";
import { VERSAO_TERMOS } from "@/lib/termos";
import { TextoTermos } from "@/components/aluno/termos";
import { aceitarTermos } from "@/app/(aluno)/acoes";

export const metadata = { title: "Boas-vindas · Área do Aluno CA" };

/** Primeiro acesso: o aluno aceita os termos antes de entrar. */
export default async function BoasVindas() {
  const s = await exigirAluno();
  const { data: aluno } = await s.supabase.from("alunos").select("nome, termos_versao").eq("user_id", s.user.id).maybeSingle();
  if (!aluno || aluno.termos_versao === VERSAO_TERMOS) redirect("/inicio");
  const novaVersao = !!aluno.termos_versao;

  return (
    <main className="min-h-dvh px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center gap-3">
          <Image src="/brand/ca-icone.png" alt="CA" width={44} height={44} priority />
          <p className="text-xs font-semibold tracking-[0.25em] text-texto-suave">CONSULTORIA PREMIUM</p>
        </div>

        <h1 className="mt-6 text-2xl font-bold">
          {novaVersao ? "Atualizei os termos" : `Que bom ter você aqui, ${primeiroNome(aluno.nome)}!`}
        </h1>
        <p className="mt-2 text-texto-suave">
          {novaVersao
            ? "Dá uma lida no que mudou e confirma para continuar."
            : "Aqui fica tudo da sua consultoria. Antes de começar, o combinado sobre seus dados. É rápido e direto."}
        </p>

        <div className="cartao mt-6 p-5">
          <TextoTermos />
        </div>

        <form action={aceitarTermos} className="mt-6">
          <button className="botao w-full !py-4 text-base">
            <Check className="size-5" /> Li e aceito os termos
          </button>
        </form>
        <p className="mt-3 text-center text-xs text-texto-suave">Dúvida sobre algum ponto? Me chama no WhatsApp antes de aceitar.</p>
      </div>
    </main>
  );
}
