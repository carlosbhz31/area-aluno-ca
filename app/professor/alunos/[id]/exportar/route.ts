import { NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/sessao";

// LGPD: cópia de todos os dados de um aluno em JSON, para mandar a ele quando pedir.
// Fotos e PDFs vão como links temporários (valem 7 dias).

const TABELAS = [
  "dados_privados", "contratos", "anamneses", "ciclos", "acompanhamentos", "reavaliacoes", "registros_evolucao",
  "documentos", "orientacoes", "pontuacoes", "conquistas", "anotacoes_internas",
] as const;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessaoAtual();
  if (!s || s.papel !== "professor") return new NextResponse("Sem acesso", { status: 403 });
  const { id } = await params;
  const { supabase } = s;

  const { data: aluno } = await supabase.from("alunos").select("*").eq("id", id).maybeSingle();
  if (!aluno) return new NextResponse("Aluno não encontrado", { status: 404 });

  const dados: Record<string, unknown> = { aluno };
  for (const t of TABELAS) {
    const { data } = await supabase.from(t).select("*").eq("aluno_id", id);
    dados[t] = data ?? [];
  }

  const arquivos: { bucket: string; caminho: string; link: string | null }[] = [];
  for (const bucket of ["fotos", "documentos", "contratos"]) {
    const caminhos: string[] = [];
    const listar = async (pasta: string) => {
      const { data } = await supabase.storage.from(bucket).list(pasta, { limit: 1000 });
      for (const item of data ?? []) {
        if (item.id) caminhos.push(`${pasta}/${item.name}`);
        else await listar(`${pasta}/${item.name}`);
      }
    };
    await listar(id);
    if (!caminhos.length) continue;
    const { data: links } = await supabase.storage.from(bucket).createSignedUrls(caminhos, 7 * 86_400);
    for (const c of caminhos) arquivos.push({ bucket, caminho: c, link: links?.find((l) => l.path === c)?.signedUrl ?? null });
  }
  dados.arquivos = arquivos;
  dados.exportado_em = new Date().toISOString();

  const nomeArquivo = `dados-${String(aluno.nome).normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase()}.json`;
  return new NextResponse(JSON.stringify(dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
