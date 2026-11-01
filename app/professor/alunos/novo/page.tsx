import Link from "next/link";
import { ArrowLeft, Link2, Trash2, UserPlus } from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { apagarConvite, criarAluno, criarConvite } from "../../acoes";
import { CompartilharLink, FormCadastro, FormConvite } from "@/components/professor/formularios";
import { dataBR } from "@/lib/formato";

export const metadata = { title: "Novo aluno · Painel do Professor" };

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://area-aluno-ca.vercel.app").trim().replace(/\/$/, "");

export default async function NovoAluno() {
  const { supabase } = await exigirProfessor();
  const { data: convites } = await supabase
    .from("convites_cadastro")
    .select("id, rotulo, criado_em, expira_em, usado_em, aluno_id, alunos(nome)")
    .order("criado_em", { ascending: false })
    .limit(15);
  const agora = Date.now();
  const abertos = (convites ?? []).filter((c) => !c.usado_em && Date.parse(c.expira_em) > agora);
  const usados = (convites ?? []).filter((c) => c.usado_em && c.aluno_id).slice(0, 5);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/professor/alunos" className="inline-flex items-center gap-1 text-sm text-texto-suave hover:text-marca">
        <ArrowLeft className="size-4" /> Alunos
      </Link>
      <h1 className="text-2xl font-bold">Novo aluno</h1>

      <section className="cartao space-y-4 p-6">
        <div>
          <h2 className="flex items-center gap-2 font-bold"><Link2 className="size-5 text-marca" /> Mandar link de cadastro</h2>
          <p className="mt-1 text-sm text-texto-suave">O aluno preenche nome, e-mail, WhatsApp e nascimento e já entra no app. Você define aqui o plano e o app de treino.</p>
        </div>
        <FormConvite acao={criarConvite} site={SITE} />

        {abertos.length > 0 && (
          <div className="border-t border-borda pt-4">
            <p className="rotulo mb-2">Links esperando cadastro</p>
            <ul className="space-y-3">
              {abertos.map((c) => (
                <li key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{c.rotulo ?? "Sem nome"}</span>
                    <span className="flex items-center gap-2 text-xs text-texto-suave">
                      vence {dataBR(c.expira_em)}
                      <form action={apagarConvite.bind(null, c.id)}>
                        <button aria-label="Cancelar link" className="text-texto-suave hover:text-perigo"><Trash2 className="size-4" /></button>
                      </form>
                    </span>
                  </div>
                  <CompartilharLink link={`${SITE}/cadastro/${c.id}`} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {usados.length > 0 && (
          <div className="border-t border-borda pt-4">
            <p className="rotulo mb-2">Cadastros recentes pelo link</p>
            <ul className="space-y-1 text-sm">
              {usados.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <Link href={`/professor/alunos/${c.aluno_id}`} className="text-marca">{(Array.isArray(c.alunos) ? c.alunos[0] : c.alunos)?.nome ?? c.rotulo}</Link>
                  <span className="text-texto-suave">{dataBR(c.usado_em)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="cartao p-6">
        <h2 className="flex items-center gap-2 font-bold"><UserPlus className="size-5 text-marca" /> Ou cadastrar você mesmo</h2>
        <p className="mb-4 mt-1 text-sm text-texto-suave">O e-mail vira o login. O aluno entra com link mágico, sem senha.</p>
        <FormCadastro acao={criarAluno} novo />
      </section>
    </div>
  );
}
