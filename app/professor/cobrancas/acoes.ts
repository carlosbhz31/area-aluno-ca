"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { exigirProfessor } from "@/lib/sessao";
import { hojeEmBH } from "@/lib/ciclo";
import { somarMeses, totalAulas, type CalculoAulas } from "@/lib/cobranca";
import type { Resultado } from "../acoes";

const num = (f: FormData, k: string) => {
  const n = Number(String(f.get(k) ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const txt = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max) || null;
const data = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

function atualizar(alunoId?: string) {
  revalidatePath("/professor/cobrancas");
  revalidatePath("/professor/hoje");
  if (alunoId) revalidatePath(`/professor/alunos/${alunoId}`);
}

/** Nova cobrança: parcelas mensais, pagamento já feito (integral) ou aulas do personal (calculadora). */
export async function criarCobranca(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await exigirProfessor();
  const alunoId = txt(f, "aluno_id", 60);
  const tipo = String(f.get("tipo"));
  const vencimento = data(f, "vencimento");
  const forma = txt(f, "forma", 60);
  const observacao = txt(f, "observacao", 500);
  if (!alunoId) return { erro: "Escolha o aluno." };
  if (!vencimento) return { erro: "Coloque a data." };

  let linhas: Record<string, unknown>[] = [];
  if (tipo === "aulas") {
    const calculo: CalculoAulas = { aulas: num(f, "aulas"), valor_aula: num(f, "valor_aula"), aulas_ferias: num(f, "aulas_ferias"), pct_ferias: num(f, "pct_ferias") || 30, ajuste: num(f, "ajuste") };
    const valor = totalAulas(calculo);
    if (valor <= 0) return { erro: "O total das aulas ficou zerado." };
    linhas = [{ aluno_id: alunoId, descricao: txt(f, "descricao") ?? "Aulas presenciais", valor, vencimento, forma, calculo, observacao }];
  } else {
    const valor = num(f, "valor");
    if (valor <= 0) return { erro: "Coloque o valor." };
    const n = tipo === "pago" ? 1 : Math.min(36, Math.max(1, Math.round(num(f, "parcelas")) || 1));
    const descricao = txt(f, "descricao") ?? "Consultoria";
    const grupo = randomUUID();
    linhas = Array.from({ length: n }, (_, i) => ({
      aluno_id: alunoId,
      descricao: n > 1 ? `${descricao} ${i + 1}/${n}` : descricao,
      valor,
      vencimento: somarMeses(vencimento, i),
      pago_em: tipo === "pago" ? vencimento : null,
      forma,
      parcela: n > 1 ? i + 1 : null,
      total_parcelas: n > 1 ? n : null,
      grupo: n > 1 ? grupo : null,
      observacao,
    }));
  }
  const { error } = await supabase.from("cobrancas").insert(linhas);
  if (error) return { erro: "Não consegui salvar." };
  atualizar(alunoId);
  return { ok: linhas.length > 1 ? `${linhas.length} parcelas criadas.` : "Cobrança criada." };
}

/** Marca como recebido hoje (ou desfaz). */
export async function marcarPago(id: string, pago: boolean) {
  const { supabase } = await exigirProfessor();
  const { data: c } = await supabase.from("cobrancas").update({ pago_em: pago ? hojeEmBH() : null }).eq("id", id).select("aluno_id").maybeSingle();
  atualizar(c?.aluno_id);
}

export async function excluirCobranca(id: string) {
  const { supabase } = await exigirProfessor();
  const { data: c } = await supabase.from("cobrancas").delete().eq("id", id).select("aluno_id").maybeSingle();
  atualizar(c?.aluno_id);
}
