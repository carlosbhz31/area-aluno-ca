import Link from "next/link";
import {
  AlertTriangle, CalendarCheck, ChevronRight, Clock, Hourglass, Inbox, Megaphone, RefreshCw, ScrollText,
} from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { hojeEmBH, situacaoDoCiclo, emRetaFinal } from "@/lib/ciclo";
import { prazoDaSemana, sinaisDeAlerta, type Respostas } from "@/lib/acompanhamento";
import { dataBR } from "@/lib/formato";
import type { Aluno, Ciclo } from "@/lib/tipos";
import { Cartao, Selo, TituloCartao } from "@/components/ui";
import { FormOrientacao } from "@/components/professor/formularios";
import { publicarOrientacao } from "../acoes";

export const metadata = { title: "Hoje · Painel do Professor" };

const DIA_MS = 86_400_000;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / DIA_MS);

type Linha = { id: string; href: string; nome: string; detalhe: string; selos?: { texto: string; tom: "alerta" | "perigo" | "marca" | "ok" | "neutro" }[] };

function Lista({ titulo, icone, linhas, vazio }: { titulo: string; icone: typeof Inbox; linhas: Linha[]; vazio: string }) {
  return (
    <Cartao>
      <TituloCartao icone={icone} acao={<span className="text-sm font-bold">{linhas.length}</span>}>{titulo}</TituloCartao>
      {linhas.length ? (
        <ul className="-mx-2 divide-y divide-borda">
          {linhas.map((l) => (
            <li key={l.id}>
              <Link href={l.href} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-fundo">
                <span className="flex-1">
                  <span className="block font-semibold">{l.nome}</span>
                  <span className="text-xs text-texto-suave">{l.detalhe}</span>
                </span>
                <span className="flex flex-wrap justify-end gap-1">{l.selos?.map((s) => <Selo key={s.texto} tom={s.tom}>{s.texto}</Selo>)}</span>
                <ChevronRight className="size-4 shrink-0 text-texto-suave" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-texto-suave">{vazio}</p>
      )}
    </Cartao>
  );
}

export default async function Hoje() {
  const { supabase } = await exigirProfessor();
  const hoje = hojeEmBH();
  const ha60 = new Date(Date.now() - 60 * DIA_MS).toISOString();

  const [alunosR, pendentesR, recentesR, evolucaoR, anamnesesR, reavR, cfgR, usaAcompR, usaEvolR] = await Promise.all([
    supabase.from("alunos").select("*, ciclos(*)").neq("situacao", "inativo").order("nome"),
    supabase.from("acompanhamentos").select("id, aluno_id, semana, enviado_em, respostas").is("resposta_professor", null).order("enviado_em"),
    supabase.from("acompanhamentos").select("aluno_id, ciclo_id, semana, enviado_em").gte("enviado_em", ha60),
    supabase.from("registros_evolucao").select("aluno_id, criado_em").gte("criado_em", ha60),
    supabase.from("anamneses").select("id, aluno_id, tipo, concluida_em").eq("status", "concluida"),
    supabase.from("reavaliacoes").select("ciclo_id, formato"),
    supabase.from("configuracoes").select("valor").eq("chave", "dia_padrao_acompanhamento").maybeSingle(),
    supabase.from("acompanhamentos").select("aluno_id"),
    supabase.from("registros_evolucao").select("aluno_id").gt("criado_em", "2026-11-01"), // registros importados do sistema antigo não contam
  ]);

  // Só cobra atraso de quem já começou a usar o app (mandou acompanhamento ou registrou evolução)
  const usaApp = new Set([...(usaAcompR.data ?? []), ...(usaEvolR.data ?? [])].map((x) => x.aluno_id));

  const diaPadrao = Number(cfgR.data?.valor ?? 1);
  const alunos = (alunosR.data ?? []).map((a) => {
    const { ciclos, ...resto } = a as Aluno & { ciclos: Ciclo[] };
    return { aluno: resto as Aluno, ciclo: ciclos.find((c) => c.ativo) ?? null };
  });
  const porId = new Map(alunos.map((x) => [x.aluno.id, x.aluno]));
  const nome = (id: string) => porId.get(id)?.nome ?? "Aluno";
  const reavPorCiclo = new Map((reavR.data ?? []).map((r) => [r.ciclo_id, r.formato as string]));

  // Última atividade (check-in ou evolução) por aluno
  const ultimaAtividade = new Map<string, string>();
  for (const r of [...(recentesR.data ?? []).map((a) => ({ id: a.aluno_id, em: a.enviado_em })), ...(evolucaoR.data ?? []).map((e) => ({ id: e.aluno_id, em: e.criado_em }))]) {
    if (!ultimaAtividade.has(r.id) || ultimaAtividade.get(r.id)! < r.em) ultimaAtividade.set(r.id, r.em);
  }

  // 1) Acompanhamentos sem resposta
  const semResposta: Linha[] = (pendentesR.data ?? [])
    .filter((p) => porId.has(p.aluno_id))
    .map((p) => {
      const sinais = sinaisDeAlerta(p.respostas as Partial<Respostas>);
      return {
        id: p.id,
        href: `/professor/acompanhamentos/${p.id}`,
        nome: nome(p.aluno_id),
        detalhe: `${p.semana ? `Semana ${p.semana} · ` : ""}enviado ${dataBR(p.enviado_em)}`,
        selos: sinais.map((s) => ({ texto: s, tom: "alerta" as const })),
      };
    });

  const atrasados: Linha[] = [];
  const reavaliacao: Linha[] = [];
  const renovacoes: Linha[] = [];
  const parados: Linha[] = [];

  for (const { aluno, ciclo } of alunos) {
    const href = `/professor/alunos/${aluno.id}`;
    const s = situacaoDoCiclo(ciclo, hoje);

    // 2) Atrasados: passou do dia combinado e não mandou a desta semana
    const prazo = prazoDaSemana(ciclo, aluno.dia_acompanhamento ?? diaPadrao, hoje);
    if (aluno.situacao === "ativo" && usaApp.has(aluno.id) && prazo.tipo === "ativo" && !prazo.pausado && prazo.diasAtraso >= 1) {
      const enviou = (recentesR.data ?? []).some((a) => a.ciclo_id === ciclo!.id && a.semana === prazo.semana);
      if (!enviou) atrasados.push({ id: aluno.id, href, nome: aluno.nome, detalhe: `Semana ${prazo.semana} · era ${dataBR(prazo.vence)}`, selos: [{ texto: `${prazo.diasAtraso} dia${prazo.diasAtraso > 1 ? "s" : ""}`, tom: prazo.diasAtraso >= 3 ? "perigo" : "alerta" }] });
    }

    // 3) Semana 7 em diante / ciclo encerrado: reavaliação
    if ((s.tipo === "em_andamento" && emRetaFinal(s)) || s.tipo === "encerrado") {
      const formato = ciclo ? reavPorCiclo.get(ciclo.id) : undefined;
      reavaliacao.push({
        id: aluno.id, href, nome: aluno.nome,
        detalhe: s.tipo === "encerrado" ? `Ciclo ${ciclo!.numero} encerrado em ${dataBR(ciclo!.fim)}` : `Ciclo ${ciclo!.numero} · semana ${s.semana} de ${s.total}`,
        selos: [formato ? { texto: formato === "call" ? "Quer call" : "Pelo WhatsApp", tom: "marca" } : { texto: "Ainda não escolheu", tom: "neutro" }],
      });
    }

    // 4) Renovação nos próximos 30 dias (ou vencida)
    if (aluno.fim) {
      const d = diasEntre(hoje, aluno.fim);
      if (d <= 30) renovacoes.push({ id: aluno.id, href, nome: aluno.nome, detalhe: `Contrato até ${dataBR(aluno.fim)}`, selos: [{ texto: d < 0 ? "Vencido" : d === 0 ? "Vence hoje" : `${d} dias`, tom: d < 0 ? "perigo" : "alerta" }] });
    }

    // 5) Sem registro há mais de 10 dias (com ciclo rodando)
    if (aluno.situacao === "ativo" && usaApp.has(aluno.id) && s.tipo === "em_andamento" && !s.pausado && diasEntre(ciclo!.inicio, hoje) > 10) {
      const ultima = ultimaAtividade.get(aluno.id);
      const dias = ultima ? diasEntre(ultima, hoje) : null;
      if (dias == null || dias > 10) parados.push({ id: aluno.id, href, nome: aluno.nome, detalhe: ultima ? `Último registro ${dataBR(ultima)}` : "Nenhum registro no app ainda", selos: [{ texto: dias == null ? "Nunca" : `${dias} dias`, tom: "neutro" }] });
    }
  }

  // 6) Anamneses preenchidas esperando revisão
  const anamneses: Linha[] = (anamnesesR.data ?? [])
    .filter((a) => porId.has(a.aluno_id))
    .map((a) => ({ id: a.id, href: `/professor/anamneses/${a.id}`, nome: nome(a.aluno_id), detalhe: `${a.tipo === "inicial" ? "Inicial" : "Realinhamento"} · ${dataBR(a.concluida_em)}` }));

  const total = semResposta.length + atrasados.length + reavaliacao.length;
  const naoComecaram = alunos.filter((x) => x.aluno.situacao === "ativo" && !usaApp.has(x.aluno.id)).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hoje</h1>
        <p className="text-sm text-texto-suave">
          {total ? `${total} ${total === 1 ? "coisa pede" : "coisas pedem"} sua atenção.` : "Tudo em dia por aqui."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Lista titulo="Acompanhamentos sem resposta" icone={Inbox} linhas={semResposta} vazio="Nenhum esperando resposta." />
        <Lista titulo="Acompanhamentos atrasados" icone={Clock} linhas={atrasados} vazio="Ninguém atrasado." />
        <Lista titulo="Reavaliação (semana 7 em diante)" icone={CalendarCheck} linhas={reavaliacao} vazio="Ninguém na reta final do ciclo." />
        <Lista titulo="Renovações em 30 dias" icone={RefreshCw} linhas={renovacoes} vazio="Nenhuma renovação próxima." />
        <Lista titulo="Sem registro há mais de 10 dias" icone={Hourglass} linhas={parados} vazio="Todo mundo deu sinal de vida." />
        <Lista titulo="Anamneses para revisar" icone={ScrollText} linhas={anamneses} vazio="Nenhuma anamnese nova." />
      </div>

      <Cartao>
        <TituloCartao icone={Megaphone}>Recado para todos os alunos</TituloCartao>
        <FormOrientacao acao={publicarOrientacao.bind(null, null)} paraTodos />
      </Cartao>

      {naoComecaram > 0 && (
        <p className="flex items-center gap-2 text-xs text-texto-suave">
          <AlertTriangle className="size-4" />
          {naoComecaram} {naoComecaram === 1 ? "aluno ativo ainda não usou" : "alunos ativos ainda não usaram"} o app. Eles entram em "atrasados" e "sem registro" depois do primeiro envio.
        </p>
      )}
    </div>
  );
}
