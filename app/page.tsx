import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";

export default async function Raiz() {
  const s = await sessaoAtual();
  if (!s) redirect("/entrar");
  redirect(s.papel === "professor" ? "/professor/hoje" : "/inicio");
}
