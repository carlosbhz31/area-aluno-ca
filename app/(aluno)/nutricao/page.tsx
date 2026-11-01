import { redirect } from "next/navigation";
import { Download, FileText, Salad } from "lucide-react";
import { exigirAluno } from "@/lib/sessao";
import { dataBR } from "@/lib/formato";
import { Vazio } from "@/components/ui";

export const metadata = { title: "Nutrição · Área do Aluno CA" };

export default async function Nutricao() {
  const s = await exigirAluno();
  const { data: aluno } = await s.supabase.from("alunos").select("id, tem_nutricao, nutricionista").eq("user_id", s.user.id).maybeSingle();
  if (!aluno?.tem_nutricao) redirect("/mais");

  const { data: docs } = await s.supabase
    .from("documentos")
    .select("id, titulo, versao, data, arquivo_path")
    .eq("aluno_id", aluno.id)
    .eq("tipo", "plano_alimentar")
    .order("data", { ascending: false })
    .order("versao", { ascending: false });
  const lista = docs ?? [];
  const { data: links } = lista.length
    ? await s.supabase.storage.from("documentos").createSignedUrls(lista.map((d) => d.arquivo_path), 3600)
    : { data: [] };
  const link = (p: string) => links?.find((l) => l.path === p)?.signedUrl ?? undefined;
  const [atual, ...antigos] = lista;

  return (
    <div className="mx-auto max-w-xl space-y-5 pt-2">
      <header>
        <h1 className="text-2xl font-bold">Nutrição</h1>
        <p className="text-sm text-texto-suave">Plano alimentar feito com a nutricionista {aluno.nutricionista ?? "parceira"}.</p>
      </header>

      {atual ? (
        <a href={link(atual.arquivo_path)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl bg-menu p-5 text-white">
          <span className="grid size-12 place-items-center rounded-xl bg-marca"><FileText className="size-6" /></span>
          <span className="flex-1">
            <span className="block font-bold">{atual.titulo ?? "Plano alimentar"}</span>
            <span className="text-sm text-white/70">Versão {atual.versao} · {dataBR(atual.data)}</span>
          </span>
          <Download className="size-5" />
        </a>
      ) : (
        <div className="cartao p-5">
          <Vazio icone={Salad} titulo="Seu plano alimentar está a caminho">Assim que estiver pronto, eu coloco aqui e você baixa o PDF.</Vazio>
        </div>
      )}

      {antigos.length > 0 && (
        <section>
          <h2 className="rotulo mb-2">Versões anteriores</h2>
          <ul className="cartao divide-y divide-borda">
            {antigos.map((d) => (
              <li key={d.id}>
                <a href={link(d.arquivo_path)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 text-sm">
                  <span>{d.titulo ?? "Plano alimentar"} · v{d.versao}</span>
                  <span className="text-texto-suave">{dataBR(d.data)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
