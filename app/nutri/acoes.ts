"use server";

import { revalidatePath } from "next/cache";
import { exigirNutricionista } from "@/lib/sessao";
import { avisarAluno } from "@/lib/notificar";

export type Resultado = { erro?: string; ok?: string } | undefined;

/** O PDF já subiu do navegador para a pasta do aluno; aqui registra a versão. As regras do banco
 *  só deixam a nutricionista publicar plano alimentar de aluno com nutrição. */
export async function registrarPlanoNutri(alunoId: string, caminho: string, titulo: string | null): Promise<Resultado> {
  const { supabase } = await exigirNutricionista();
  if (!caminho.startsWith(`${alunoId}/`) || caminho.includes("..")) return { erro: "Arquivo inválido." };
  const { data: ultima } = await supabase
    .from("documentos").select("versao").eq("aluno_id", alunoId).eq("tipo", "plano_alimentar")
    .order("versao", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("documentos").insert({
    aluno_id: alunoId, tipo: "plano_alimentar", titulo: titulo || "Plano alimentar", arquivo_path: caminho, versao: (ultima?.versao ?? 0) + 1,
  });
  if (error) return { erro: "O PDF subiu, mas não consegui registrar. Avisa o Carlos." };
  await avisarAluno(alunoId, { tipo: "documento", titulo: "Seu plano alimentar chegou", corpo: titulo || "Plano alimentar novo na área de Nutrição.", url: "/nutricao", referencia: caminho });
  revalidatePath("/nutri");
  return { ok: "Plano publicado. O aluno já vê na área de Nutrição." };
}
