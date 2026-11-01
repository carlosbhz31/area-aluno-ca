import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { carregarPainelAluno } from "@/lib/dados-aluno";
import { InicioAluno } from "@/components/inicio-aluno";

export const metadata = { title: "Visão do aluno · Painel do Professor" };

export default async function VisaoDoAluno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirProfessor();
  const painel = await carregarPainelAluno(supabase, { alunoId: id });
  if (!painel) notFound();

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 rounded-xl bg-marca-suave px-4 py-3 text-sm text-marca">
        <span className="flex items-center gap-2 font-semibold"><Eye className="size-4" /> Você está vendo o Início como {painel.aluno.nome.split(" ")[0]} vê.</span>
        <Link href={`/professor/alunos/${id}`} className="inline-flex items-center gap-1 font-semibold"><ArrowLeft className="size-4" /> Voltar à ficha</Link>
      </div>
      <div className="mx-auto max-w-[420px] rounded-[2rem] border-8 border-menu bg-fundo p-4 shadow-xl lg:max-w-4xl lg:rounded-2xl lg:border lg:border-borda lg:shadow-none">
        <InicioAluno painel={painel} preview />
      </div>
    </div>
  );
}
