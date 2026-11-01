import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { clienteServidor } from "./supabase/servidor";

export type Papel = "professor" | "aluno" | "nutricionista";

export const PAGINA_INICIAL: Record<Papel, string> = { professor: "/professor/hoje", aluno: "/inicio", nutricionista: "/nutri" };

/** Usuário logado e papel. Uma consulta por requisição.
 *  O login é conferido pela assinatura do token (sem ir ao servidor de login a cada página). */
export const sessaoAtual = cache(async () => {
  const supabase = await clienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const user = { id: claims.sub, email: (claims.email as string | undefined) ?? null };

  const { data: perfil } = await supabase.from("perfis").select("papel").eq("id", user.id).maybeSingle();
  return { user, papel: (perfil?.papel ?? "aluno") as Papel, supabase };
});

async function exigirPapel(papel: Papel) {
  const s = await sessaoAtual();
  if (!s) redirect("/entrar");
  if (s.papel !== papel) redirect(PAGINA_INICIAL[s.papel]);
  return s;
}

export const exigirProfessor = () => exigirPapel("professor");
export const exigirNutricionista = () => exigirPapel("nutricionista");

/** Área do aluno: quem é professor ou nutricionista é mandado para a própria área. */
export async function exigirAluno() {
  return exigirPapel("aluno");
}
