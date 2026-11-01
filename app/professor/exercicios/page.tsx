import { exigirProfessor } from "@/lib/sessao";
import { ListaExercicios } from "@/components/professor/lista-exercicios";
import type { ExercicioLista } from "../treino-acoes";

export const metadata = { title: "Exercícios · Painel do Professor" };

export default async function Exercicios() {
  const { supabase } = await exigirProfessor();
  const [{ data: exercicios }, { data: usados }] = await Promise.all([
    supabase.from("exercicios").select("id, nome, grupo, equipamento, video_url, metrica, observacoes").order("nome"),
    supabase.from("exercicios_treino").select("exercicio_id").not("exercicio_id", "is", null),
  ]);
  const usos: Record<string, number> = {};
  for (const u of usados ?? []) if (u.exercicio_id) usos[u.exercicio_id] = (usos[u.exercicio_id] ?? 0) + 1;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Exercícios</h1>
        <p className="text-sm text-texto-suave">Sua lista para montar os treinos. Cadastre o vídeo uma vez e ele aparece para todos os alunos.</p>
      </div>
      <ListaExercicios exercicios={(exercicios ?? []) as ExercicioLista[]} usos={usos} />
    </div>
  );
}
