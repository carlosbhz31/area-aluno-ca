import Image from "next/image";
import { FileText, LogOut, Salad } from "lucide-react";
import { exigirNutricionista } from "@/lib/sessao";
import { dataBR, iniciais } from "@/lib/formato";
import { Vazio } from "@/components/ui";
import { UploadPlano } from "@/components/professor/formularios";
import { registrarPlanoNutri } from "./acoes";

export const metadata = { title: "Nutrição · Área do Aluno CA" };

export default async function AreaNutricionista() {
  const { supabase, user } = await exigirNutricionista();
  const { data: alunos } = await supabase.rpc("alunos_da_nutricao");
  const lista = (alunos ?? []) as { id: string; nome: string; nutricionista: string | null }[];

  const { data: docs } = await supabase
    .from("documentos")
    .select("id, aluno_id, titulo, versao, data, arquivo_path")
    .eq("tipo", "plano_alimentar")
    .order("versao", { ascending: false });
  const { data: links } = docs?.length ? await supabase.storage.from("documentos").createSignedUrls(docs.map((d) => d.arquivo_path), 3600) : { data: [] };
  const link = (p: string) => links?.find((l) => l.path === p)?.signedUrl ?? undefined;

  return (
    <div className="min-h-dvh">
      <header className="flex items-center gap-3 bg-menu px-4 py-4 text-white md:px-10">
        <Image src="/brand/ca-icone.png" alt="" width={32} height={32} />
        <div className="flex-1 leading-tight">
          <p className="text-[10px] tracking-[0.25em] text-white/60">CONSULTORIA PREMIUM CA</p>
          <p className="font-bold">Área da Nutrição</p>
        </div>
        <span className="hidden text-xs text-white/60 sm:block">{user.email}</span>
        <form action="/auth/sair" method="post">
          <button className="flex items-center gap-1 text-sm text-white/80 hover:text-white"><LogOut className="size-4" /> Sair</button>
        </form>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 md:px-10">
        <div>
          <h1 className="text-2xl font-bold">Planos alimentares</h1>
          <p className="text-sm text-texto-suave">Alunos da consultoria com acompanhamento nutricional. O PDF publicado aparece na hora para o aluno.</p>
        </div>

        {lista.length === 0 ? (
          <div className="cartao p-5"><Vazio icone={Salad} titulo="Nenhum aluno com nutrição no momento">Quando o Carlos marcar um aluno com plano alimentar, ele aparece aqui.</Vazio></div>
        ) : (
          lista.map((a) => {
            const planos = (docs ?? []).filter((d) => d.aluno_id === a.id);
            return (
              <section key={a.id} className="cartao p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-marca-suave text-sm font-bold text-marca">{iniciais(a.nome)}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{a.nome}</p>
                    <p className="text-xs text-texto-suave">{planos.length ? `Última versão: v${planos[0].versao} em ${dataBR(planos[0].data)}` : "Ainda sem plano publicado"}</p>
                  </div>
                </div>
                {planos.length > 0 && (
                  <ul className="mb-4 space-y-1 text-sm">
                    {planos.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2">
                        <a href={link(d.arquivo_path)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-marca">
                          <FileText className="size-4" /> {d.titulo ?? "Plano alimentar"} · v{d.versao}
                        </a>
                        <span className="text-texto-suave">{dataBR(d.data)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <UploadPlano alunoId={a.id} registrar={registrarPlanoNutri.bind(null, a.id)} />
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}
