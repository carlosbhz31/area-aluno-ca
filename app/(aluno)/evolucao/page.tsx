import { exigirAluno } from "@/lib/sessao";
import { FormEvolucao } from "@/components/aluno/form-evolucao";
import { PainelEvolucao } from "@/components/evolucao";

export const metadata = { title: "Evolução · Área do Aluno CA" };

export default async function Evolucao() {
  const s = await exigirAluno();
  const { data: aluno } = await s.supabase.from("alunos").select("id").eq("user_id", s.user.id).maybeSingle();
  if (!aluno) return null;

  return (
    <div className="mx-auto max-w-xl space-y-5 pt-2">
      <header>
        <h1 className="text-2xl font-bold">Evolução</h1>
        <p className="text-sm text-texto-suave">Uma vez por semana no mesmo horário, de preferência em jejum. Só você e o Carlos veem.</p>
      </header>
      <FormEvolucao alunoId={aluno.id} />
      <PainelEvolucao supabase={s.supabase} alunoId={aluno.id} />
    </div>
  );
}
