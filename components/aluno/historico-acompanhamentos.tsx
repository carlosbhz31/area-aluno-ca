import { MessageCircleReply, ClipboardList } from "lucide-react";
import type { Respostas } from "@/lib/acompanhamento";
import { ESCALA } from "@/lib/acompanhamento";
import { dataBR } from "@/lib/formato";
import { Vazio } from "@/components/ui";

export type ItemAcompanhamento = {
  id: string;
  semana: number | null;
  enviado_em: string;
  respostas: Partial<Respostas>;
  resposta_professor: string | null;
  respondido_em: string | null;
  resposta_lida_em: string | null;
};

export function resumoRespostas(r: Partial<Respostas>): string[] {
  return [
    r.treinos_feitos != null ? `Treinos ${r.treinos_feitos}${r.treinos_planejados ? `/${r.treinos_planejados}` : ""}` : null,
    r.cardio_vezes ? `Cardio ${r.cardio_vezes}x` : null,
    r.aderencia ? `Plano: ${ESCALA[r.aderencia]}` : null,
    r.sono ? `Sono: ${ESCALA[r.sono]}` : null,
    r.energia ? `Energia: ${ESCALA[r.energia]}` : null,
    r.dor ? `Dor${r.dor_onde ? `: ${r.dor_onde}` : ""}` : null,
    r.recorde ? `Recorde: ${r.recorde}` : null,
  ].filter((x): x is string => !!x);
}

export function HistoricoAcompanhamentos({ itens }: { itens: ItemAcompanhamento[] }) {
  if (!itens.length) {
    return <Vazio icone={ClipboardList} titulo="Nenhum envio ainda">Seu primeiro acompanhamento aparece aqui, com a minha resposta.</Vazio>;
  }
  return (
    <ul className="space-y-3">
      {itens.map((a) => (
        <li key={a.id} className="cartao p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{a.semana ? `Semana ${a.semana}` : "Acompanhamento"}</span>
            <span className="text-texto-suave">{dataBR(a.enviado_em)}</span>
          </div>
          <p className="mt-1 text-xs text-texto-suave">{resumoRespostas(a.respostas).join(" · ")}</p>
          {a.respostas.duvidas && <p className="mt-2 text-sm italic">“{a.respostas.duvidas}”</p>}
          {a.resposta_professor ? (
            <div className="mt-3 rounded-xl bg-marca-suave p-3 text-sm">
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-marca">
                <MessageCircleReply className="size-4" /> Carlos {a.respondido_em && `· ${dataBR(a.respondido_em)}`}
              </p>
              <p className="whitespace-pre-line">{a.resposta_professor}</p>
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold text-alerta">Aguardando resposta</p>
          )}
        </li>
      ))}
    </ul>
  );
}
