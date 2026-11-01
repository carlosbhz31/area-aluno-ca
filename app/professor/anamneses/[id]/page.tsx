import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { etapaPendente, etapasDo, fotosDaAnamnese, type RespostasAnamnese, type TipoAnamnese } from "@/lib/anamnese";
import { dataBR } from "@/lib/formato";
import { ResumoAnamnese } from "@/components/resumo-anamnese";
import { Selo } from "@/components/ui";
import { marcarAnamneseRevisada } from "../../acoes";

export const metadata = { title: "Anamnese · Painel do Professor" };

export default async function AnamneseProfessor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirProfessor();
  const { data: a } = await supabase
    .from("anamneses")
    .select("id, aluno_id, tipo, status, respostas, criada_em, concluida_em, revisada_em, alunos(nome)")
    .eq("id", id)
    .maybeSingle();
  if (!a) notFound();

  const respostas = a.respostas as RespostasAnamnese;
  const tipo = a.tipo as TipoAnamnese;
  const nome = (Array.isArray(a.alunos) ? a.alunos[0] : a.alunos)?.nome ?? "Aluno";
  const caminhos = fotosDaAnamnese(respostas);
  const fotos: Record<string, string> = {};
  if (caminhos.length) {
    const { data: links } = await supabase.storage.from("fotos").createSignedUrls(caminhos, 3600);
    for (const l of links ?? []) if (l.path && l.signedUrl) fotos[l.path] = l.signedUrl;
  }
  const pendente = etapaPendente(tipo, respostas);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/professor/alunos/${a.aluno_id}`} className="inline-flex items-center gap-1 text-sm text-texto-suave hover:text-marca">
        <ArrowLeft className="size-4" /> {nome}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Anamnese {tipo === "inicial" ? "inicial" : "de realinhamento"}</h1>
          <p className="mt-1 text-sm text-texto-suave">
            {a.status === "rascunho"
              ? `Em preenchimento · etapa ${pendente + 1} de ${etapasDo(tipo).length}`
              : `Enviada em ${dataBR(a.concluida_em)}`}
            {a.revisada_em && ` · revisada em ${dataBR(a.revisada_em)}`}
          </p>
        </div>
        {a.status === "concluida" ? (
          <form action={marcarAnamneseRevisada.bind(null, a.id)}>
            <button className="botao"><CheckCircle2 className="size-4" /> Marcar como revisada</button>
          </form>
        ) : (
          <Selo tom={a.status === "revisada" ? "ok" : "alerta"}>{a.status === "revisada" ? "Revisada" : "Rascunho"}</Selo>
        )}
      </header>

      {a.status === "concluida" && (
        <p className="text-sm text-texto-suave">Depois de revisada, o aluno não consegue mais mudar as respostas.</p>
      )}

      <ResumoAnamnese tipo={tipo} respostas={respostas} fotos={fotos} />
    </div>
  );
}
