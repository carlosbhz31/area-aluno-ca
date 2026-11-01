import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { criarAluno } from "../../acoes";
import { FormCadastro } from "@/components/professor/formularios";

export const metadata = { title: "Novo aluno · Painel do Professor" };

export default async function NovoAluno() {
  await exigirProfessor();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/professor/alunos" className="inline-flex items-center gap-1 text-sm text-texto-suave hover:text-marca">
        <ArrowLeft className="size-4" /> Alunos
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Novo aluno</h1>
        <p className="text-sm text-texto-suave">O e-mail vira o login. O aluno entra com link mágico, sem senha.</p>
      </div>
      <section className="cartao p-6">
        <FormCadastro acao={criarAluno} novo />
      </section>
    </div>
  );
}
