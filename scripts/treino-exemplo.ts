// Cadastra um programa de treino de exemplo (A e B) para testar a execução no celular.
// Substitui o programa ativo do aluno. Uso:
//   npx tsx --env-file=.env.local scripts/treino-exemplo.ts aluno.demo@exemplo.invalid

import { clienteAdmin } from "./comum.ts";

const email = process.argv[2];
if (!email) {
  console.error("Informe o e-mail do aluno.");
  process.exit(1);
}
const admin = clienteAdmin();
const { data: aluno } = await admin.from("alunos").select("id").eq("email", email).maybeSingle();
if (!aluno) {
  console.error("Aluno não encontrado.");
  process.exit(1);
}

const fixo = (series: number, min: number, max: number, pausa: number) => [{ series, min, max, pausa }];
// Prescrição que muda com a semana do ciclo (como no método de 8 semanas)
const ondulada = [
  { series: 3, min: 12, max: 15, pausa: 60 },
  { series: 3, min: 10, max: 12, pausa: 60 },
  { series: 4, min: 8, max: 10, pausa: 90 },
  { series: 4, min: 6, max: 8, pausa: 90 },
  { series: 2, min: 12, max: 15, pausa: 60 },
  { series: 3, min: 10, max: 12, pausa: 60 },
  { series: 4, min: 8, max: 10, pausa: 90 },
  { series: 4, min: 6, max: 8, pausa: 90 },
];

const TREINOS = [
  {
    nome: "Treino A",
    foco: "Inferiores",
    exercicios: [
      { nome: "Agachamento livre", grupo: "Quadríceps", equipamento: "Barra", aquecimento: 1, prescricao: ondulada, observacoes: "Desce controlando, 2 segundos na descida." },
      { nome: "Leg press 45°", grupo: "Quadríceps", equipamento: "Máquina", prescricao: fixo(3, 10, 12, 60) },
      { nome: "Mesa flexora", grupo: "Posteriores", equipamento: "Máquina", prescricao: fixo(3, 10, 12, 45) },
      { nome: "Prancha", grupo: "Abdômen", metrica: "segundos", prescricao: fixo(3, 30, 30, 30) },
    ],
  },
  {
    nome: "Treino B",
    foco: "Superiores",
    exercicios: [
      { nome: "Supino reto com halteres", grupo: "Peito", equipamento: "Halteres", aquecimento: 1, prescricao: ondulada },
      { nome: "Puxada pronada", grupo: "Costas", equipamento: "Polia", prescricao: fixo(3, 10, 12, 60) },
      { nome: "Desenvolvimento com halteres", grupo: "Ombros", equipamento: "Halteres", prescricao: fixo(3, 10, 12, 60) },
      { nome: "Tríceps na polia", grupo: "Tríceps", equipamento: "Polia", prescricao: fixo(3, 12, 15, 30) },
    ],
  },
];

await admin.from("programas").update({ ativo: false }).eq("aluno_id", aluno.id).eq("ativo", true);
const { data: programa, error } = await admin
  .from("programas")
  .insert({ aluno_id: aluno.id, nome: "Programa de teste", observacoes: "Treino de exemplo para testar o app. Pausas curtas de propósito." })
  .select("id")
  .single();
if (error || !programa) throw error;

for (const [i, t] of TREINOS.entries()) {
  const { data: treino } = await admin.from("treinos").insert({ programa_id: programa.id, aluno_id: aluno.id, ordem: i + 1, nome: t.nome, foco: t.foco }).select("id").single();
  await admin.from("exercicios_treino").insert(
    t.exercicios.map((e, j) => ({ treino_id: treino!.id, aluno_id: aluno.id, ordem: j + 1, metrica: "reps", aquecimento: 0, ...e })),
  );
}
console.log("Programa de teste cadastrado (Treino A e Treino B).");
