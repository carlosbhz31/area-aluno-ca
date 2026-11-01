import { CalendarClock, CheckCircle2, PauseCircle } from "lucide-react";
import { exigirAluno } from "@/lib/sessao";
import { carregarPainelAluno } from "@/lib/dados-aluno";
import { dataBR } from "@/lib/formato";
import { DIAS } from "@/lib/tipos";
import { FormAcompanhamento } from "@/components/aluno/form-acompanhamento";
import { HistoricoAcompanhamentos, type ItemAcompanhamento } from "@/components/aluno/historico-acompanhamentos";

export const metadata = { title: "Acompanhamento · Área do Aluno CA" };

export default async function Acompanhamento() {
  const s = await exigirAluno();
  const painel = await carregarPainelAluno(s.supabase, { userId: s.user.id });
  if (!painel) return null;

  const { data } = await s.supabase
    .from("acompanhamentos")
    .select("id, semana, enviado_em, respostas, resposta_professor, respondido_em, resposta_lida_em")
    .eq("aluno_id", painel.aluno.id)
    .order("enviado_em", { ascending: false })
    .limit(20);
  const itens = (data ?? []) as ItemAcompanhamento[];

  // Abriu a tela: as respostas novas contam como lidas
  await Promise.all(
    itens.filter((a) => a.resposta_professor && !a.resposta_lida_em).map((a) => s.supabase.rpc("marcar_resposta_lida", { acompanhamento: a.id })),
  );

  const { prazo } = painel;
  const dia = DIAS[painel.diaAcompanhamento].toLowerCase();

  return (
    <div className="mx-auto max-w-xl space-y-5 pt-2">
      <header>
        <h1 className="text-2xl font-bold">Acompanhamento</h1>
        <p className="text-sm text-texto-suave">Uma vez por semana, de preferência na {dia}. Leva 1 minuto.</p>
      </header>

      {prazo.tipo !== "ativo" ? (
        <div className="cartao flex items-start gap-3 p-5 text-sm">
          <CalendarClock className="size-5 shrink-0 text-marca" />
          <p>{prazo.tipo === "sem_ciclo" ? "Seu ciclo ainda não começou. Quando começar, o acompanhamento abre aqui." : "Ciclo fechado. Enquanto monto o próximo, me manda notícias pelo WhatsApp."}</p>
        </div>
      ) : prazo.pausado ? (
        <div className="cartao flex items-start gap-3 p-5 text-sm">
          <PauseCircle className="size-5 shrink-0 text-alerta" />
          <p>Seu ciclo está pausado. O acompanhamento volta quando a gente retomar.</p>
        </div>
      ) : painel.enviadoNaSemana ? (
        <div className="cartao flex items-start gap-3 p-5 text-sm">
          <CheckCircle2 className="size-5 shrink-0 text-ok" />
          <p><strong>Semana {prazo.semana} enviada.</strong> O próximo abre na semana que vem.</p>
        </div>
      ) : (
        <>
          {prazo.diasAtraso > 0 && (
            <p className="rounded-xl bg-alerta-suave px-4 py-3 text-sm font-semibold text-alerta">
              Era pra {dataBR(prazo.vence)}. Manda agora que ainda dá tempo.
            </p>
          )}
          <FormAcompanhamento semana={prazo.semana} />
        </>
      )}

      <section className="space-y-3">
        <h2 className="rotulo">Histórico</h2>
        <HistoricoAcompanhamentos itens={itens} />
      </section>
    </div>
  );
}
