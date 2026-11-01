import { MessageCircle, ShieldCheck } from "lucide-react";
import { exigirAluno } from "@/lib/sessao";
import { dataBR, linkWhatsapp } from "@/lib/formato";
import { TextoTermos } from "@/components/aluno/termos";

export const metadata = { title: "Privacidade · Área do Aluno CA" };

export default async function Privacidade() {
  const s = await exigirAluno();
  const [{ data: aluno }, { data: cfg }] = await Promise.all([
    s.supabase.from("alunos").select("termos_aceitos_em").eq("user_id", s.user.id).maybeSingle(),
    s.supabase.from("configuracoes").select("valor").eq("chave", "whatsapp_carlos").maybeSingle(),
  ]);
  const zap = linkWhatsapp(cfg?.valor as string | null, "Oi, Carlos! Queria falar sobre os meus dados na Área do Aluno.");

  return (
    <div className="mx-auto max-w-xl space-y-4 pt-2">
      <h1 className="text-2xl font-bold">Termos e privacidade</h1>
      {aluno?.termos_aceitos_em && (
        <p className="flex items-center gap-2 text-sm text-texto-suave">
          <ShieldCheck className="size-4 text-ok" /> Você aceitou em {dataBR(aluno.termos_aceitos_em)}.
        </p>
      )}
      <div className="cartao p-5"><TextoTermos /></div>
      {zap && (
        <a href={zap} target="_blank" rel="noopener noreferrer" className="botao-secundario w-full">
          <MessageCircle className="size-4" /> Pedir cópia, correção ou exclusão dos dados
        </a>
      )}
    </div>
  );
}
