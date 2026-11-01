import { CalendarDays, FileSignature, MessageSquareText } from "lucide-react";
import { exigirAluno } from "@/lib/sessao";
import { carregarPainelAluno } from "@/lib/dados-aluno";
import { situacaoDoCiclo } from "@/lib/ciclo";
import { dataBR } from "@/lib/formato";
import { DIAS, NOME_PLANO } from "@/lib/tipos";
import { Barra, Cartao, TituloCartao } from "@/components/ui";

export const metadata = { title: "Meu plano · Área do Aluno CA" };

export default async function MeuPlano() {
  const s = await exigirAluno();
  const painel = await carregarPainelAluno(s.supabase, { userId: s.user.id });
  if (!painel) return null;
  const { aluno, ciclo } = painel;
  const sit = situacaoDoCiclo(ciclo);

  const { data: orientacoes } = await s.supabase
    .from("orientacoes")
    .select("id, texto, publicada_em")
    .or(`aluno_id.eq.${aluno.id},aluno_id.is.null`)
    .order("publicada_em", { ascending: false })
    .limit(5);

  return (
    <div className="mx-auto max-w-xl space-y-4 pt-2">
      <h1 className="text-2xl font-bold">Meu plano</h1>

      <Cartao>
        <TituloCartao icone={CalendarDays}>Ciclo atual</TituloCartao>
        {ciclo ? (
          <>
            <p className="text-lg font-bold">Ciclo {ciclo.numero}{sit.tipo === "em_andamento" ? ` · semana ${sit.semana} de ${sit.total}` : ""}</p>
            {sit.tipo === "em_andamento" && <Barra valor={sit.progresso} className="mt-2" />}
            <p className="mt-2 text-sm text-texto-suave">{dataBR(ciclo.inicio)} a {dataBR(ciclo.fim)}</p>
            {ciclo.objetivo && <p className="mt-2 text-sm">Objetivo: {ciclo.objetivo}</p>}
          </>
        ) : (
          <p className="text-sm text-texto-suave">Seu ciclo está sendo montado.</p>
        )}
        <p className="mt-3 text-sm text-texto-suave">Acompanhamento toda {DIAS[painel.diaAcompanhamento].toLowerCase()}.</p>
      </Cartao>

      <Cartao>
        <TituloCartao icone={FileSignature}>Consultoria</TituloCartao>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="rotulo">Plano</dt><dd className="font-semibold">{NOME_PLANO[aluno.plano]}</dd></div>
          <div><dt className="rotulo">Tempo</dt><dd className="font-semibold">{aluno.tempo_contratado ?? "—"}</dd></div>
          <div><dt className="rotulo">Início</dt><dd className="font-semibold">{dataBR(aluno.inicio)}</dd></div>
          <div><dt className="rotulo">Até</dt><dd className="font-semibold">{dataBR(aluno.fim)}</dd></div>
        </dl>
      </Cartao>

      <Cartao>
        <TituloCartao icone={MessageSquareText}>Recados do Carlos</TituloCartao>
        {orientacoes?.length ? (
          <ul className="space-y-3">
            {orientacoes.map((o) => (
              <li key={o.id} className="border-l-2 border-marca pl-3 text-sm">
                <p className="whitespace-pre-line">{o.texto}</p>
                <p className="mt-0.5 text-xs text-texto-suave">{dataBR(o.publicada_em)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-texto-suave">Quando eu deixar um recado da semana, ele fica guardado aqui.</p>
        )}
      </Cartao>
    </div>
  );
}
