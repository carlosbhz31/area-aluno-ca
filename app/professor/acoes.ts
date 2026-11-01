"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirProfessor } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/servidor";
import { hojeEmBH } from "@/lib/ciclo";
import { avisarAluno } from "@/lib/notificar";
import { conquistar, REGRAS_PADRAO } from "@/lib/gamificacao";

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
    tem_nutricao: f.get("tem_nutricao") === "on",
  };
}

/** Garante um usuário de login para o e-mail (sem senha; entra por link mágico). */
async function garantirLogin(email: string) {
  const { error } = await clienteAdmin().auth.admin.createUser({ email, email_confirm: true });
  if (error && !/already|registered|exists/i.test(error.message)) throw error;
}

/** Inativo não entra no app: bloqueia o login. Ativo ou pausado: libera. Nada do cadastro é apagado. */
async function sincronizarAcesso(alunoId: string) {
  const admin = clienteAdmin();
  const { data: a } = await admin.from("alunos").select("user_id, situacao").eq("id", alunoId).single();
  if (!a?.user_id) return;
  const { data: perfil } = await admin.from("perfis").select("papel").eq("id", a.user_id).maybeSingle();
  if (perfil?.papel === "professor") return; // nunca bloquear o login do professor
  await admin.auth.admin.updateUserById(a.user_id, { ban_duration: a.situacao === "inativo" ? "876000h" : "none" });
}

export async function mudarSituacao(alunoId: string, situacao: "ativo" | "inativo") {
  const { supabase } = await exigirProfessor();
  await supabase.from("alunos").update({ situacao }).eq("id", alunoId);
  await sincronizarAcesso(alunoId);
  revalidatePath(`/professor/alunos/${alunoId}`);
  revalidatePath("/professor/alunos");
}

export async function salvarDadosPrivados(alunoId: string, _: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await exigirProfessor();
  const uf = texto(f, "uf")?.toUpperCase() ?? null;
  if (uf && !/^[A-Z]{2}$/.test(uf)) return { erro: "UF com 2 letras, ex.: MG." };
  const { error } = await supabase.from("dados_privados").upsert({
    aluno_id: alunoId,
    cpf: texto(f, "cpf"),
    cep: texto(f, "cep"),
    logradouro: texto(f, "logradouro"),
    numero: texto(f, "numero"),
    complemento: texto(f, "complemento"),
    bairro: texto(f, "bairro"),
    cidade: texto(f, "cidade"),
    uf,
  });
  if (error) return { erro: "Não consegui salvar o endereço." };
  revalidatePath(`/professor/alunos/${alunoId}`);
  return { ok: "Endereço salvo." };
}

export async function criarAluno(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await exigirProfessor();
  const dados = dadosDoCadastro(f);
  if (!dados.nome || !dados.email) return { erro: "Nome e e-mail são obrigatórios." };

  const { data, error } = await supabase.from("alunos").insert(dados).select("id").single();
  if (error) return { erro: error.code === "23505" ? "Já existe aluno com esse e-mail." : "Não consegui salvar. Confere os campos." };

  try {
    await garantirLogin(dados.email);
    await sincronizarAcesso(data.id);
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
    await sincronizarAcesso(alunoId);
  } catch {
    return { erro: "Cadastro salvo, mas não consegui atualizar o login desse e-mail." };
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

export async function responderAcompanhamento(id: string, alunoId: string, _: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await exigirProfessor();
  const resposta = texto(f, "resposta");
  if (!resposta) return { erro: "Escreve a resposta antes de enviar." };
  const { error } = await supabase
    .from("acompanhamentos")
    .update({ resposta_professor: resposta, respondido_em: new Date().toISOString(), resposta_lida_em: null, atencao: f.get("atencao") === "on" })
    .eq("id", id);
  if (error) return { erro: "Não consegui salvar a resposta." };
  await avisarAluno(alunoId, { tipo: "resposta", titulo: "Respondi seu acompanhamento", corpo: resposta.slice(0, 120), url: "/acompanhamento", referencia: `${id}-${Date.now()}` });
  revalidatePath("/professor/hoje");
  revalidatePath(`/professor/alunos/${alunoId}`);
  revalidatePath(`/professor/acompanhamentos/${id}`);
  return { ok: "Resposta enviada. Aparece no app do aluno." };
}

/** Recado da semana: para um aluno (alunoId) ou para todos (null). Fica no Início por 7 dias. */
export async function publicarOrientacao(alunoId: string | null, _: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await exigirProfessor();
  const t = texto(f, "texto");
  if (!t) return { erro: "Escreve o recado antes de publicar." };
  const { data: orient, error } = await supabase.from("orientacoes").insert({ aluno_id: alunoId, texto: t }).select("id").single();
  if (error) return { erro: "Não consegui publicar." };

  const aviso = { tipo: "orientacao", titulo: "Recado novo do Carlos", corpo: t.slice(0, 120), url: "/inicio", referencia: orient.id };
  if (alunoId) {
    await avisarAluno(alunoId, aviso);
  } else {
    const { data: todos } = await clienteAdmin().from("alunos").select("id").neq("situacao", "inativo").not("user_id", "is", null);
    await Promise.all((todos ?? []).map((a) => avisarAluno(a.id, aviso)));
  }
  revalidatePath("/professor/hoje");
  if (alunoId) revalidatePath(`/professor/alunos/${alunoId}`);
  return { ok: alunoId ? "Publicado no Início do aluno." : "Publicado no Início de todos." };
}

/** O PDF já subiu direto do navegador para a pasta privada do aluno; aqui só registra a versão. */
export async function registrarDocumento(alunoId: string, caminho: string, titulo: string | null): Promise<Resultado> {
  const { supabase } = await exigirProfessor();
  if (!caminho.startsWith(`${alunoId}/`) || caminho.includes("..")) return { erro: "Arquivo inválido." };
  const { data: ultima } = await supabase
    .from("documentos").select("versao").eq("aluno_id", alunoId).eq("tipo", "plano_alimentar")
    .order("versao", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("documentos").insert({
    aluno_id: alunoId, tipo: "plano_alimentar", titulo: titulo || "Plano alimentar", arquivo_path: caminho, versao: (ultima?.versao ?? 0) + 1,
  });
  if (error) return { erro: "O PDF subiu, mas não consegui registrar." };
  // Quem recebe plano alimentar passa a ver a área de Nutrição
  await supabase.from("alunos").update({ tem_nutricao: true }).eq("id", alunoId).eq("tem_nutricao", false);
  await avisarAluno(alunoId, { tipo: "documento", titulo: "Seu plano alimentar chegou", corpo: titulo || "Plano alimentar novo na área de Nutrição.", url: "/nutricao", referencia: caminho });
  revalidatePath(`/professor/alunos/${alunoId}`);
  return { ok: "PDF publicado na área de Nutrição do aluno." };
}

export async function salvarConfiguracoes(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await exigirProfessor();
  const whatsapp = texto(f, "whatsapp_carlos")?.replace(/\D/g, "") || null;
  if (whatsapp && whatsapp.length < 10) return { erro: "WhatsApp com DDD, ex.: 31 99999-9999." };
  const agenda = texto(f, "link_agenda");
  if (agenda && !/^https:\/\//.test(agenda)) return { erro: "O link da agenda tem que começar com https://" };
  const dia = Number(texto(f, "dia_padrao_acompanhamento") ?? 1);
  const linhas = [
    // vazio vira "" (a coluna não aceita nulo)
    { chave: "whatsapp_carlos", valor: whatsapp ?? "" },
    { chave: "link_agenda", valor: agenda ?? "" },
    { chave: "dia_padrao_acompanhamento", valor: dia },
  ];
  const { error } = await supabase.from("configuracoes").upsert(linhas);
  if (error) return { erro: "Não consegui salvar." };
  revalidatePath("/professor/configuracoes");
  return { ok: "Salvo." };
}

/** Libera o acesso da nutricionista (login por link, só vê os planos alimentares). */
export async function liberarNutricionista(_: Resultado, f: FormData): Promise<Resultado> {
  await exigirProfessor();
  const email = texto(f, "email")?.toLowerCase();
  if (!email || !email.includes("@")) return { erro: "Coloca o e-mail da nutricionista." };
  const admin = clienteAdmin();

  const { data: aluno } = await admin.from("alunos").select("id").eq("email", email).maybeSingle();
  if (aluno) return { erro: "Esse e-mail é de um aluno. Use outro e-mail para a nutricionista." };

  const { data: criado, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  let id = criado?.user?.id;
  if (error) {
    if (!/already|registered|exists/i.test(error.message)) return { erro: "Não consegui criar o acesso." };
    for (let pagina = 1; !id; pagina++) {
      const { data } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
      if (!data.users.length) break;
      id = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    }
  }
  if (!id) return { erro: "Não consegui criar o acesso." };

  const { data: perfil } = await admin.from("perfis").select("papel").eq("id", id).maybeSingle();
  if (perfil?.papel === "professor") return { erro: "Esse e-mail é de professor." };
  await admin.from("perfis").upsert({ id, papel: "nutricionista" });
  await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
  revalidatePath("/professor/configuracoes");
  return { ok: "Acesso liberado. Ela entra em area-aluno-ca.vercel.app com esse e-mail." };
}

export async function removerNutricionista(id: string) {
  await exigirProfessor();
  const admin = clienteAdmin();
  const { data: perfil } = await admin.from("perfis").select("papel").eq("id", id).maybeSingle();
  if (perfil?.papel !== "nutricionista") return;
  await admin.auth.admin.deleteUser(id); // os PDFs que ela publicou continuam com os alunos
  revalidatePath("/professor/configuracoes");
}

/** Regras de pontos e faixas das ligas (valem a partir de agora; pontos já lançados não mudam). */
export async function salvarJogo(_: Resultado, f: FormData): Promise<Resultado> {
  const { supabase } = await exigirProfessor();
  const regras = Object.fromEntries(
    Object.keys(REGRAS_PADRAO).map((k) => [k, Math.max(-50, Math.min(50, Math.round(Number(f.get(`regra_${k}`) ?? 0)) || 0))]),
  );
  const ligas = ["Ferro", "Bronze", "Prata", "Ouro", "Platina", "Diamante", "Mestre"].map((liga, i) => ({
    liga,
    min: i === 0 ? 0 : Math.max(1, Math.round(Number(f.get(`liga_${liga}`) ?? 0)) || 0),
  }));
  for (let i = 1; i < ligas.length; i++) {
    if (ligas[i].min <= ligas[i - 1].min) return { erro: `${ligas[i].liga} precisa de mais pontos que ${ligas[i - 1].liga}.` };
  }
  const { error } = await supabase.from("configuracoes").upsert([
    { chave: "regras_pontos", valor: regras },
    { chave: "faixas_ligas", valor: ligas },
  ]);
  if (error) return { erro: "Não consegui salvar." };
  revalidatePath("/professor/configuracoes");
  return { ok: "Salvo." };
}

/** Broches que dependem do olhar do Carlos (meta do ciclo, renovação). */
export async function darConquista(alunoId: string, broche: "meta_ciclo" | "renovacao") {
  await exigirProfessor();
  await conquistar(alunoId, broche);
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
