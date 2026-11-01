import { CalendarCheck, MessageCircle, Video } from "lucide-react";
import { escolherReavaliacao } from "@/app/(aluno)/acoes";
import { linkWhatsapp } from "@/lib/formato";
import type { Contato } from "@/lib/dados-aluno";

/** Semana 7 em diante: o aluno escolhe como fazer a reavaliação (call ou WhatsApp). */
export function CartaoReavaliacao({
  escolha, contato, primeiroNome, preview,
}: { escolha: "call" | "whatsapp" | null; contato: Contato; primeiroNome: string; preview: boolean }) {
  const zapCall = linkWhatsapp(contato.whatsapp, `Oi Carlos, aqui é ${primeiroNome}. Quero marcar a call da reavaliação.`);
  const zapReav = linkWhatsapp(contato.whatsapp, `Oi Carlos, aqui é ${primeiroNome}. Vamos fazer a reavaliação por aqui?`);
  const linkCall = contato.agenda ?? zapCall;

  return (
    <section className="rounded-2xl border-2 border-marca bg-cartao p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-marca"><CalendarCheck className="size-4" /> Reavaliação do ciclo</p>
      {escolha ? (
        <>
          <p className="mt-2 text-lg font-bold">
            {escolha === "call" ? "Combinado: vamos de call." : "Combinado: resolvemos pelo WhatsApp."}
          </p>
          <p className="mt-1 text-sm text-texto-suave">
            {escolha === "call"
              ? contato.agenda ? "Escolhe o melhor horário na minha agenda." : "Me chama que a gente acha um horário."
              : "Separa as fotos e as cargas da semana e me manda por lá."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(escolha === "call" ? linkCall : zapReav) && (
              <a href={(escolha === "call" ? linkCall : zapReav)!} target="_blank" rel="noopener noreferrer" className="botao">
                {escolha === "call" ? <><Video className="size-4" /> {contato.agenda ? "Abrir agenda" : "Chamar no WhatsApp"}</> : <><MessageCircle className="size-4" /> Abrir WhatsApp</>}
              </a>
            )}
            {!preview && (
              <form action={escolherReavaliacao.bind(null, escolha === "call" ? "whatsapp" : "call")}>
                <button className="botao-secundario">Mudar para {escolha === "call" ? "WhatsApp" : "call"}</button>
              </form>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-lg font-bold">O ciclo está fechando. Como prefere fazer a reavaliação?</p>
          <p className="mt-1 text-sm text-texto-suave">A gente olha juntos como foi e define o próximo ciclo.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <form action={escolherReavaliacao.bind(null, "call")}>
              <button className="botao w-full !px-2" disabled={preview}><Video className="size-4" /> Marcar call</button>
            </form>
            <form action={escolherReavaliacao.bind(null, "whatsapp")}>
              <button className="botao-secundario w-full !px-2" disabled={preview}><MessageCircle className="size-4" /> Pelo WhatsApp</button>
            </form>
          </div>
        </>
      )}
    </section>
  );
}
