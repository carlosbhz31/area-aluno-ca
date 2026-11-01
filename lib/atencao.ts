import { situacaoDoCiclo, hojeEmBH, emRetaFinal } from "./ciclo";
import type { Aluno, Ciclo } from "./tipos";

export type Alerta = { texto: string; tom: "alerta" | "perigo" | "marca" };

function diasAte(iso: string, hoje: string) {
  return Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(hoje)) / 86_400_000);
}

/** Motivos para o aluno aparecer em "precisa de atenção". */
export function alertasDoAluno(aluno: Aluno, ciclo: Ciclo | null, hoje = hojeEmBH()): Alerta[] {
  if (aluno.situacao === "inativo") return [];
  const alertas: Alerta[] = [];
  const s = situacaoDoCiclo(ciclo, hoje);

  if (aluno.situacao === "ativo" && s.tipo === "sem_ciclo") alertas.push({ texto: "Sem ciclo ativo", tom: "alerta" });
  if (s.tipo === "encerrado") alertas.push({ texto: "Ciclo encerrado", tom: "perigo" });
  if (emRetaFinal(s) && s.tipo === "em_andamento") alertas.push({ texto: `Semana ${s.semana}: reavaliação`, tom: "marca" });
  if (!aluno.app_treino) alertas.push({ texto: "Sem app de treino", tom: "alerta" });
  if (aluno.fim) {
    const d = diasAte(aluno.fim, hoje);
    if (d < 0) alertas.push({ texto: "Contrato vencido", tom: "perigo" });
    else if (d <= 30) alertas.push({ texto: `Renova em ${d} dias`, tom: "alerta" });
  }
  return alertas;
}
