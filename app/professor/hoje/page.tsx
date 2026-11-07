import Link from "next/link";
import {
  AlertTriangle, Cake, CalendarCheck, ChevronRight, Clock, Dumbbell, Hourglass, Inbox, Megaphone, PlayCircle, RefreshCw, ScrollText, Wallet,
} from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { hojeEmBH, situacaoDoCiclo, emRetaFinal } from "@/lib/ciclo";
import { prazoDaSemana, sinaisDeAlerta, type Respostas } from "@/lib/acompanhamento";
import { dataBR, moedaBR } from "@/lib/formato";
import type { Aluno, Ciclo } from "@/lib/tipos";
import { Cartao, Selo, TituloCartao } from "@/components/ui";
import { FormOrientacao } from "@/components/professor/formularios";
import { publicarOrientacao } from "../acoes";
import { esforcoDe } from "@/lib/treino";

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
  const [programasR, treinosR, cobrancasR] = await Promise.all([
    supabase.from("programas").select("aluno_id").eq("ativo", true),
    supabase
      .from("execucoes")
      .select("id, aluno_id, nome_treino, iniciada_em, concluida_em, esforco, comentario")
      .gte("iniciada_em", new Date(Date.now() - 30 * DIA_MS).toISOString())
      .order("iniciada_em", { ascending: false }),
    supabase.from("cobrancas").select("id, aluno_id, descricao, valor, vencimento").is("pago_em", null).lte("vencimento", hoje).order("vencimento"),
  ]);
  // Pagamentos que vencem hoje ou já venceram
  const cobrancas: Linha[] = (cobrancasR.data ?? []).map((c) => ({
    id: c.id,
    href: "/professor/cobrancas",
    nome: porId.get(c.aluno_id)?.nome ?? "Aluno",
    detalhe: `${c.descricao} · ${moedaBR(Number(c.valor))}`,
    selos: [{ texto: c.vencimento === hoje ? "Vence hoje" : `Venceu ${dataBR(c.vencimento).slice(0, 5)}`, tom: c.vencimento === hoje ? ("alerta" as const) : ("perigo" as const) }],
  }));

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

  // 7) Treinos de hoje: quem já treinou, quem está treinando agora e quem ainda não foi
  const inicioHoje = Date.parse(`${hoje}T00:00:00-03:00`);
  const comPrograma = [...new Set((programasR.data ?? []).map((p) => p.aluno_id))].filter((id) => porId.get(id)?.situacao === "ativo");
  const execs = treinosR.data ?? [];
  const deHoje = execs.filter((e) => Date.parse(e.iniciada_em) >= inicioHoje && porId.has(e.aluno_id));
  const concluiram = deHoje.filter((e) => e.concluida_em);
  const treinando = deHoje.filter((e) => !e.concluida_em);
  const foram = new Set(deHoje.map((e) => e.aluno_id));
  const faltam = comPrograma
    .filter((id) => !foram.has(id))
    .map((id) => ({ id, ultimo: execs.find((e) => e.aluno_id === id && e.concluida_em)?.iniciada_em ?? null }))
    .sort((a, b) => (b.ultimo ?? "").localeCompare(a.ultimo ?? "") || nome(a.id).localeCompare(nome(b.id)));
  const hora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

  // 8) Aniversários nos próximos 7 dias
  const aniversarios: Linha[] = alunos
    .filter(({ aluno }) => aluno.situacao !== "inativo" && aluno.nascimento)
    .map(({ aluno }) => {
      const md = aluno.nascimento!.slice(5, 10);
      let prox = `${hoje.slice(0, 4)}-${md}`;
      if (prox < hoje) prox = `${Number(hoje.slice(0, 4)) + 1}-${md}`;
      return { aluno, d: diasEntre(hoje, prox), idade: Number(prox.slice(0, 4)) - Number(aluno.nascimento!.slice(0, 4)) };
    })
    .filter((x) => x.d <= 7)
    .sort((a, b) => a.d - b.d)
    .map(({ aluno, d, idade }) => ({
      id: aluno.id,
      href: `/professor/alunos/${aluno.id}`,
      nome: aluno.nome,
      detalhe: `${dataBR(aluno.nascimento).slice(0, 5)} · faz ${idade} anos`,
      selos: [{ texto: d === 0 ? "🎂 Hoje" : d === 1 ? "Amanhã" : `em ${d} dias`, tom: d === 0 ? ("ok" as const) : ("neutro" as const) }],
    }));

  const presenciais = alunos.map((x) => x.aluno).filter((a) => a.situacao === "ativo" && a.modalidade !== "consultoria");
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


      {presenciais.length > 0 && (
        <Cartao>
          <TituloCartao icone={PlayCircle}>Aula presencial</TituloCartao>
          <p className="mb-3 text-sm text-texto-suave">Toque no aluno para registrar a aula no seu celular.</p>
          <ul className="flex flex-wrap gap-2">
            {presenciais.map((a) => (
              <li key={a.id}>
                <Link href={`/professor/alunos/${a.id}/personal`} className="botao-secundario !py-1.5 text-sm"><PlayCircle className="size-4" /> {a.nome.split(" ").slice(0, 2).join(" ")}</Link>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {comPrograma.length > 0 && (
        <Cartao>
          <TituloCartao icone={Dumbbell} acao={<span className="text-sm font-bold">{concluiram.length}/{comPrograma.length}</span>}>Treinos de hoje</TituloCartao>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="rotulo mb-2">Já treinaram</p>
              {concluiram.length || treinando.length ? (
                <ul className="-mx-2 divide-y divide-borda">
                  {[...treinando, ...concluiram].map((e) => {
                    const esf = esforcoDe(e.esforco);
                    return (
                      <li key={e.id}>
                        <Link href={`/professor/alunos/${e.aluno_id}/treino`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-fundo">
                          <span className="text-lg">{e.concluida_em ? "✅" : "🏋️"}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{nome(e.aluno_id)}</span>
                            <span className="block truncate text-xs text-texto-suave">
                              {e.nome_treino} · {e.concluida_em ? `terminou ${hora(e.concluida_em)}` : `treinando agora (começou ${hora(e.iniciada_em)})`}
                            </span>
                            {e.comentario && <span className="block truncate text-xs text-marca">“{e.comentario}”</span>}
                          </span>
                          {esf && <Selo tom={esf.valor >= 10 ? "alerta" : "neutro"}>{esf.emoji} {esf.rotulo}</Selo>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-texto-suave">Ninguém treinou ainda hoje.</p>
              )}
            </div>
            <div>
              <p className="rotulo mb-2">Ainda não treinaram ({faltam.length})</p>
              <ul className="flex flex-wrap gap-1.5">
                {faltam.map((f) => (
                  <li key={f.id}>
                    <Link href={`/professor/alunos/${f.id}/treino`} className="inline-flex items-center gap-1 rounded-full border border-borda px-2.5 py-1 text-xs hover:bg-fundo">
                      <span className="font-medium">{nome(f.id).split(" ")[0]}</span>
                      <span className="text-texto-suave">{f.ultimo ? `· ${dataBR(f.ultimo).slice(0, 5)}` : "· nunca"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Cartao>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {cobrancas.length > 0 && <Lista titulo="Pagamentos para conferir" icone={Wallet} linhas={cobrancas} vazio="" />}
        {aniversarios.length > 0 && <Lista titulo="Aniversários (próximos 7 dias)" icone={Cake} linhas={aniversarios} vazio="" />}
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
