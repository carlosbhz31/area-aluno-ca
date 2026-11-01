"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirProfessor } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/servidor";
import { hojeEmBH } from "@/lib/ciclo";

export type Resultado = { erro?: string; ok?: string } | undefined;

const texto = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const numero = (f: FormData, k: string) => {
  const v = texto(f, k);
  if (v == null) return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function dadosDoCadastro(f: FormData) {
  const dia = texto(f, "dia_acompanhamento");
  return {
    nome: texto(f, "nome"),
    email: texto(f, "email")?.toLowerCase() ?? null,
    telefone: texto(f, "telefone"),
    nascimento: texto(f, "nascimento"),
    situacao: texto(f, "situacao") ?? "ativo",
    plano: texto(f, "plano") ?? "premium",
    valor_contratado: numero(f, "valor_contratado"),
    forma_pagamento: texto(f, "forma_pagamento"),
    tempo_contratado: texto(f, "tempo_contratado"),
    inicio: texto(f, "inicio"),
    fim: texto(f, "fim"),
    app_treino: texto(f, "app_treino"),
    app_treino_link: texto(f, "app_treino_link"),
    dia_acompanhamento: dia == null ? null : Number(dia),
    objetivo: texto(f, "objetivo"),
    nutricionista: texto(f, "nutricionista"),
  };
}

/** Garante um usuário de login para o e-mail (sem senha; entra por link mágico). */
async function garantirLogin(email: string) {
  const { error } = await clienteAdmin().auth.admin.createUser({ email, email_confirm: true });
  if (error && !/already|registered|exists/i.test(error.message)) throw error;
}

export async function criarAluno(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await exigirProfessor();
  const dados = dadosDoCadastro(f);
  if (!dados.nome || !dados.email) return { erro: "Nome e e-mail são obrigatórios." };

  const { data, error } = await supabase.from("alunos").insert(dados).select("id").single();
  if (error) return { erro: error.code === "23505" ? "Já existe aluno com esse e-mail." : "Não consegui salvar. Confere os campos." };

  try {
    await garantirLogin(dados.email);
  } catch {
    return { erro: "Aluno salvo, mas não consegui liberar o login. Tenta salvar a ficha de novo." };
  }

  const inicioCiclo = texto(f, "inicio_ciclo");
  if (inicioCiclo) {
    await supabase.from("ciclos").insert({ aluno_id: data.id, numero: 1, inicio: inicioCiclo, objetivo: dados.objetivo });
  }

  revalidatePath("/professor/alunos");
  redirect(`/professor/alunos/${data.id}`);
}

export async function salvarCadastro(alunoId: string, _: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await exigirProfessor();
  const dados = dadosDoCadastro(f);
  if (!dados.nome || !dados.email) return { erro: "Nome e e-mail são obrigatórios." };

  const { error } = await supabase.from("alunos").update(dados).eq("id", alunoId);
  if (error) return { erro: error.code === "23505" ? "Já existe aluno com esse e-mail." : "Não consegui salvar. Confere os campos." };

  try {
    await garantirLogin(dados.email);
  } catch {
    return { erro: "Cadastro salvo, mas não consegui liberar o login desse e-mail." };
  }

  revalidatePath(`/professor/alunos/${alunoId}`);
  return { ok: "Salvo." };
}

export async function novoCiclo(alunoId: string, _: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await exigirProfessor();
  const inicio = texto(f, "inicio");
  if (!inicio) return { erro: "Informe a data de início." };

  const { data: anteriores } = await supabase.from("ciclos").select("numero").eq("aluno_id", alunoId).order("numero", { ascending: false }).limit(1);
  await supabase.from("ciclos").update({ ativo: false }).eq("aluno_id", alunoId).eq("ativo", true);

  const { error } = await supabase.from("ciclos").insert({
    aluno_id: alunoId,
    numero: (anteriores?.[0]?.numero ?? 0) + 1,
    inicio,
    semanas: numero(f, "semanas") ?? 8,
    objetivo: texto(f, "objetivo"),
    link_ciclo: texto(f, "link_ciclo"),
    link_prontuario: texto(f, "link_prontuario"),
  });
  if (error) return { erro: "Não consegui criar o ciclo." };

  revalidatePath(`/professor/alunos/${alunoId}`);
  return { ok: "Ciclo criado." };
}

export async function editarCiclo(alunoId: string, cicloId: string, _: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await exigirProfessor();
  const { error } = await supabase
    .from("ciclos")
    .update({
      inicio: texto(f, "inicio"),
      semanas: numero(f, "semanas") ?? 8,
      objetivo: texto(f, "objetivo"),
      link_ciclo: texto(f, "link_ciclo"),
      link_prontuario: texto(f, "link_prontuario"),
    })
    .eq("id", cicloId);
  if (error) return { erro: "Não consegui salvar o ciclo." };
  revalidatePath(`/professor/alunos/${alunoId}`);
  return { ok: "Ciclo salvo." };
}

export async function pausarOuRetomarCiclo(alunoId: string, cicloId: string) {
  const { supabase } = await exigirProfessor();
  const { data: c } = await supabase.from("ciclos").select("pausado_desde, dias_pausados").eq("id", cicloId).single();
  if (!c) return;
  const hoje = hojeEmBH();

  if (c.pausado_desde) {
    const dias = Math.max(0, Math.round((Date.parse(hoje) - Date.parse(c.pausado_desde)) / 86_400_000));
    await supabase.from("ciclos").update({ pausado_desde: null, dias_pausados: c.dias_pausados + dias }).eq("id", cicloId);
  } else {
    await supabase.from("ciclos").update({ pausado_desde: hoje }).eq("id", cicloId);
  }
  revalidatePath(`/professor/alunos/${alunoId}`);
}

export async function adicionarAnotacao(alunoId: string, _: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await exigirProfessor();
  const t = texto(f, "texto");
  if (!t) return { erro: "Escreve alguma coisa antes de salvar." };
  const { error } = await supabase.from("anotacoes_internas").insert({ aluno_id: alunoId, texto: t });
  if (error) return { erro: "Não consegui salvar a anotação." };
  revalidatePath(`/professor/alunos/${alunoId}`);
  return { ok: "Anotado." };
}
