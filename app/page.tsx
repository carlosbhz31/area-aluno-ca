import { redirect } from "next/navigation";
import { PAGINA_INICIAL, sessaoAtual } from "@/lib/sessao";

export default async function Raiz() {
  const s = await sessaoAtual();
  if (!s) redirect("/entrar");
  redirect(PAGINA_INICIAL[s.papel]);
}
