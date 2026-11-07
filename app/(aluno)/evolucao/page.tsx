import Link from "next/link";
import { exigirAluno } from "@/lib/sessao";
import { FormEvolucao } from "@/components/aluno/form-evolucao";
import { PainelEvolucao } from "@/components/evolucao";
import { HistoricoTreinos } from "@/components/historico-treinos";

export const metadata = { title: "Evolução · Área do Aluno CA" };

export default async function Evolucao({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  const treinos = aba === "treinos";
  const s = await exigirAluno();
  const { data: aluno } = await s.supabase.from("alunos").select("id").eq("user_id", s.user.id).maybeSingle();
  if (!aluno) return null;

  const abaCls = (ativa: boolean) => `flex-1 rounded-lg py-2 text-center text-sm font-semibold ${ativa ? "bg-marca text-white" : "text-texto-suave"}`;

  return (
    <div className="mx-auto max-w-xl space-y-5 pt-2">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold">Evolução</h1>
        <nav className="flex gap-1 rounded-xl border border-borda bg-cartao p-1">
          <Link href="/evolucao" className={abaCls(!treinos)} replace>Corpo</Link>
          <Link href="/evolucao?aba=treinos" className={abaCls(treinos)} replace>Treinos</Link>
        </nav>
      </header>
      {treinos ? (
        <HistoricoTreinos supabase={s.supabase} alunoId={aluno.id} />
      ) : (
        <>
          <p className="text-sm text-texto-suave">Uma vez por semana no mesmo horário, de preferência em jejum. Só você e o Carlos veem.</p>
          <FormEvolucao alunoId={aluno.id} />
          <PainelEvolucao supabase={s.supabase} alunoId={aluno.id} />
        </>
      )}
    </div>
  );
}
