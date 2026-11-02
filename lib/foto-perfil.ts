import "server-only";
import { clienteAdmin } from "./supabase/servidor";

/** Links temporários (1 dia) das fotos de perfil: caminho no bucket → link. */
export async function linksFotoPerfil(caminhos: (string | null | undefined)[]): Promise<Record<string, string>> {
  const lista = [...new Set(caminhos.filter((c): c is string => Boolean(c)))];
  if (!lista.length) return {};
  const { data } = await clienteAdmin().storage.from("fotos").createSignedUrls(lista, 86_400);
  return Object.fromEntries((data ?? []).filter((d) => d.path && d.signedUrl).map((d) => [d.path!, d.signedUrl as string]));
}
