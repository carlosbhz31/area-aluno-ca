import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { clienteServidor } from "./supabase/servidor";

export type Papel = "professor" | "aluno";

/** Usuário logado e papel (professor/aluno). Uma consulta por requisição. */
export const sessaoAtual = cache(async () => {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase.from("perfis").select("papel").eq("id", user.id).maybeSingle();
  return { user, papel: (perfil?.papel ?? "aluno") as Papel, supabase };
});

export async function exigirProfessor() {
  const s = await sessaoAtual();
  if (!s) redirect("/entrar");
  if (s.papel !== "professor") redirect("/inicio");
  return s;
}

export async function exigirAluno() {
  const s = await sessaoAtual();
  if (!s) redirect("/entrar");
  return s;
}
