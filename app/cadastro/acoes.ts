"use server";

import { clienteAdmin } from "@/lib/supabase/servidor";
import { avisar } from "@/lib/notificar";

export type ResultadoCadastro = { erro?: string; email?: string } | undefined;

const texto = (f: FormData, k: string, max = 200) => {
  const v = String(f.get(k) ?? "").trim().slice(0, max);
  return v === "" ? null : v;
};

/** O aluno preenche os próprios dados pelo link que o Carlos mandou. */
export async function enviarCadastro(codigo: string, _: ResultadoCadastro, f: FormData): Promise<ResultadoCadastro> {
  if (!/^[0-9a-f-]{36}$/i.test(codigo)) return { erro: "Link inválido." };
  const nome = texto(f, "nome");
  const email = texto(f, "email")?.toLowerCase() ?? null;
  const telefone = texto(f, "telefone", 30);
  const nascimento = texto(f, "nascimento", 10);
  if (!nome || nome.split(/\s+/).length < 2) return { erro: "Coloca seu nome completo." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Confere o e-mail." };
  if (!telefone || telefone.replace(/\D/g, "").length < 10) return { erro: "Coloca o WhatsApp com DDD." };
  if (nascimento && !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return { erro: "Confere a data de nascimento." };

  const admin = clienteAdmin();
  const { count } = await admin.from("alunos").select("id", { count: "exact", head: true }).eq("email", email);
  if (count) return { erro: "Esse e-mail já está cadastrado. É só entrar pela tela de login." };

  // Marca o convite como usado antes de criar (dois envios ao mesmo tempo: só um passa)
  const { data: convite } = await admin
    .from("convites_cadastro")
    .update({ usado_em: new Date().toISOString() })
    .eq("id", codigo)
    .is("usado_em", null)
    .gt("expira_em", new Date().toISOString())
    .select("id, plano, valor_contratado, app_treino, tem_nutricao")
    .maybeSingle();
  if (!convite) return { erro: "Esse link já foi usado ou venceu. Pede um novo ao Carlos." };

  const { data: aluno, error } = await admin
    .from("alunos")
    .insert({
      nome, email, telefone, nascimento,
      plano: convite.plano, valor_contratado: convite.valor_contratado, app_treino: convite.app_treino, tem_nutricao: convite.tem_nutricao,
    })
    .select("id")
    .single();
  if (error || !aluno) {
    await admin.from("convites_cadastro").update({ usado_em: null }).eq("id", codigo); // devolve o link
    return { erro: error?.code === "23505" ? "Esse e-mail já está cadastrado. É só entrar pela tela de login." : "Não consegui salvar. Tenta de novo." };
  }
  await admin.from("convites_cadastro").update({ aluno_id: aluno.id }).eq("id", codigo);

  // Login (sem senha): o próprio banco liga o usuário ao cadastro pelo e-mail
  const { error: eLogin } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (eLogin && !/already|registered|exists/i.test(eLogin.message)) console.error("cadastro: login", eLogin.message);

  try {
    const { data: profs } = await admin.from("perfis").select("id").eq("papel", "professor");
    for (const p of profs ?? []) {
      await avisar({ userId: p.id, tipo: "cadastro", referencia: aluno.id, titulo: "Novo aluno cadastrado", corpo: `${nome} preencheu o cadastro pelo link.`, url: `/professor/alunos/${aluno.id}` });
    }
  } catch (e) {
    console.error("cadastro: aviso", (e as Error).message);
  }
  return { email };
}
