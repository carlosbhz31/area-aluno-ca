import Link from "next/link";
import { CheckCircle2, ClipboardPen, Pencil, UserX } from "lucide-react";
import { exigirAluno } from "@/lib/sessao";
import { etapaPendente, fotosDaAnamnese, type RespostasAnamnese, type TipoAnamnese } from "@/lib/anamnese";
import { dataBR } from "@/lib/formato";
import { FormAnamnese } from "@/components/aluno/form-anamnese";
import { ResumoAnamnese } from "@/components/resumo-anamnese";
import { Selo, Vazio } from "@/components/ui";

export const metadata = { title: "Anamnese · Área do Aluno CA" };

type Linha = { id: string; tipo: TipoAnamnese; status: "rascunho" | "concluida" | "revisada"; respostas: RespostasAnamnese; concluida_em: string | null };

export default async function Anamnese({ searchParams }: { searchParams: Promise<{ editar?: string; enviada?: string }> }) {
  const { editar, enviada } = await searchParams;
  const s = await exigirAluno();
  const { data: aluno } = await s.supabase.from("alunos").select("id").eq("user_id", s.user.id).maybeSingle();
  if (!aluno) {
    return <div className="mx-auto max-w-md pt-10"><Vazio icone={UserX} titulo="Seu acesso não está ativo" /></div>;
  }

  const { data } = await s.supabase
    .from("anamneses")
    .select("id, tipo, status, respostas, concluida_em")
    .eq("aluno_id", aluno.id)
    .order("criada_em", { ascending: false });
  const lista = (data ?? []) as Linha[];
  const rascunho = lista.find((a) => a.status === "rascunho");
  const ultima = lista.find((a) => a.status !== "rascunho");
  const emEdicao = rascunho ?? (editar && ultima?.status === "concluida" ? ultima : null);
  const mostrarForm = !!emEdicao || !ultima;

  const doc = emEdicao ?? ultima;
  const caminhos = doc ? fotosDaAnamnese(doc.respostas) : [];
  const fotos: Record<string, string> = {};
  if (caminhos.length) {
    const { data: links } = await s.supabase.storage.from("fotos").createSignedUrls(caminhos, 3600);
    for (const l of links ?? []) if (l.path && l.signedUrl) fotos[l.path] = l.signedUrl;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 pt-2">
      <header>
        <h1 className="text-2xl font-bold">{emEdicao?.tipo === "realinhamento" || (!emEdicao && ultima?.tipo === "realinhamento") ? "Anamnese de realinhamento" : "Anamnese"}</h1>
        {mostrarForm && (
          <p className="mt-1 text-sm text-texto-suave">
            {emEdicao?.tipo === "realinhamento"
              ? "Já deixei suas últimas respostas. É só atualizar o que mudou."
              : "Cada etapa fica salva quando você avança. Pode parar e voltar depois."}
          </p>
        )}
      </header>

      {mostrarForm ? (
        <FormAnamnese
          key={emEdicao?.id ?? "nova"}
          alunoId={aluno.id}
          anamneseId={emEdicao?.id ?? null}
          tipo={emEdicao?.tipo ?? "inicial"}
          respostas={emEdicao?.respostas ?? {}}
          etapaInicial={emEdicao && emEdicao.status === "rascunho" ? Math.max(0, etapaPendente(emEdicao.tipo, emEdicao.respostas)) : 0}
          fotos={fotos}
        />
      ) : (
        <>
          {enviada ? (
            <section className="flex items-start gap-3 rounded-2xl bg-ok-suave p-4 text-ok">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              <p className="text-sm"><strong>Recebi sua anamnese!</strong> Vou ler com calma e uso tudo isso para montar seu treino.</p>
            </section>
          ) : null}
          <section className="cartao flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span className="flex items-center gap-2">
              <ClipboardPen className="size-4 text-marca" />
              Enviada em {dataBR(ultima!.concluida_em)}
            </span>
            {ultima!.status === "revisada" ? <Selo tom="ok">Revisada pelo Carlos</Selo> : (
              <Link href="/anamnese?editar=1" className="flex items-center gap-1 font-semibold text-marca"><Pencil className="size-4" /> Corrigir respostas</Link>
            )}
          </section>
          <ResumoAnamnese tipo={ultima!.tipo} respostas={ultima!.respostas} fotos={fotos} />
        </>
      )}
    </div>
  );
}
