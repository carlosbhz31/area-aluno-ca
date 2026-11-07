import { NextResponse, type NextRequest } from "next/server";
import { clienteAdmin } from "@/lib/supabase/servidor";
import { hojeEmBH, situacaoDoCiclo } from "@/lib/ciclo";
import { prazoDaSemana } from "@/lib/acompanhamento";
import { avisar, emailConfigurado, enviarEmail, htmlEmail } from "@/lib/notificar";
import { dataBR } from "@/lib/formato";
import type { Aluno, Ciclo } from "@/lib/tipos";

// Rotina diária (Vercel Cron, 8h de BH): lembretes aos alunos e resumo do dia para o Carlos.
// Só lembra quem já entrou no app pelo menos uma vez.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DIA = 86_400_000;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / DIA);

export async function GET(request: NextRequest) {
  const segredo = (process.env.CRON_SECRET ?? "").replace(/[﻿\s"']/g, "");
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const admin = clienteAdmin();
  const hoje = hojeEmBH();
  const ontem = new Date(Date.now() - DIA).toISOString();

  const [alunosR, cfgR, acompR, recentesR, evolR, anamR, reavR, profR] = await Promise.all([
    admin.from("alunos").select("*, ciclos(*)").eq("situacao", "ativo"),
    admin.from("configuracoes").select("valor").eq("chave", "dia_padrao_acompanhamento").maybeSingle(),
    admin.from("acompanhamentos").select("aluno_id, ciclo_id, semana, enviado_em, resposta_professor"),
    admin.from("acompanhamentos").select("aluno_id").gte("enviado_em", ontem),
    admin.from("registros_evolucao").select("aluno_id, criado_em").gte("criado_em", new Date(Date.now() - 60 * DIA).toISOString()),
    admin.from("anamneses").select("aluno_id").eq("status", "concluida"),
    admin.from("reavaliacoes").select("ciclo_id, formato"),
    admin.from("perfis").select("id").eq("papel", "professor"),
  ]);

  // Quem já entrou no app (último acesso registrado no login)
  const entrou = new Set<string>();
  for (let pagina = 1; ; pagina++) {
    const { data } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (!data.users.length) break;
    data.users.filter((u) => u.last_sign_in_at).forEach((u) => entrou.add(u.id));
  }

  const diaPadrao = Number(cfgR.data?.valor ?? 1);
  const acomps = acompR.data ?? [];
  const reav = new Map((reavR.data ?? []).map((r) => [r.ciclo_id, r.formato]));
  const ultimaAtividade = new Map<string, string>();
  for (const x of [...acomps.map((a) => ({ id: a.aluno_id, em: a.enviado_em })), ...(evolR.data ?? []).map((e) => ({ id: e.aluno_id, em: e.criado_em }))]) {
    if (!ultimaAtividade.has(x.id) || ultimaAtividade.get(x.id)! < x.em) ultimaAtividade.set(x.id, x.em);
  }

  const enviados = { checkin: 0, atraso: 0, semana7: 0, emails: 0 };
  const resumo = { semana7: [] as string[], renovacao: [] as string[], parados: [] as string[] };

  for (const linha of alunosR.data ?? []) {
    const { ciclos, ...resto } = linha as Aluno & { ciclos: Ciclo[]; silencio_inicio: number; silencio_fim: number };
    const aluno = resto as Aluno & { silencio_inicio: number; silencio_fim: number };
    const ciclo = ciclos.find((c) => c.ativo) ?? null;
    const s = situacaoDoCiclo(ciclo, hoje);

    if (aluno.fim) {
      const d = diasEntre(hoje, aluno.fim);
      if (d >= 0 && d <= 30) resumo.renovacao.push(`${aluno.nome} (${dataBR(aluno.fim)})`);
    }
    if (s.tipo === "em_andamento" && s.semana === s.total - 1 && s.diaDaSemana === 1) {
      resumo.semana7.push(`${aluno.nome}${reav.get(ciclo!.id) ? ` · escolheu ${reav.get(ciclo!.id) === "call" ? "call" : "WhatsApp"}` : ""}`);
    }

    if (!aluno.user_id || !entrou.has(aluno.user_id) || !ciclo || s.tipo !== "em_andamento" || s.pausado) continue;
    const ultima = ultimaAtividade.get(aluno.id);
    if (diasEntre(ciclo.inicio, hoje) > 10 && (!ultima || diasEntre(ultima, hoje) > 10)) resumo.parados.push(aluno.nome);

    const silencio = { inicio: aluno.silencio_inicio, fim: aluno.silencio_fim };
    const prazo = prazoDaSemana(ciclo, aluno.dia_acompanhamento ?? diaPadrao, hoje);
    if (prazo.tipo !== "ativo") continue;
    const enviou = acomps.some((a) => a.ciclo_id === ciclo.id && a.semana === prazo.semana);
    const ref = `${ciclo.id}-${prazo.semana}`;

    if (!enviou && prazo.ehHoje) {
      if ((await avisar({ userId: aluno.user_id, silencio, tipo: "dia_checkin", referencia: ref, titulo: "Hoje é dia de acompanhamento", corpo: "Me conta como foi a semana. Leva 1 minuto.", url: "/acompanhamento" })) === "enviado") enviados.checkin++;
    }
    if (!enviou && prazo.diasAtraso === 2) {
      const r = await avisar({ userId: aluno.user_id, silencio, tipo: "atraso_checkin", referencia: ref, titulo: "Seu acompanhamento ficou pra trás", corpo: "Manda hoje que ainda dá tempo.", url: "/acompanhamento" });
      if (r !== "repetido") {
        enviados.atraso++;
        const ok = await enviarEmail(
          aluno.email,
          "Seu acompanhamento da semana",
          htmlEmail("Faltou o acompanhamento desta semana", `<p>Oi, ${aluno.nome.split(" ")[0]}! Ainda não recebi como foi sua semana ${prazo.semana}. Leva 1 minuto.</p>`, { texto: "Enviar acompanhamento", url: "/acompanhamento" }),
        ).catch(() => false);
        if (ok) enviados.emails++;
      }
    }
    if (s.semana === s.total - 1) {
      if ((await avisar({ userId: aluno.user_id, silencio, tipo: "semana7", referencia: ciclo.id, titulo: "Semana 7: reta final do ciclo", corpo: "Escolhe como prefere fazer a reavaliação: call ou WhatsApp.", url: "/inicio" })) === "enviado") enviados.semana7++;
    }
  }

  // Aniversário de aluno hoje: aviso no celular do professor
  const aniversariantes = (alunosR.data ?? []).filter((a) => a.nascimento && String(a.nascimento).slice(5, 10) === hoje.slice(5, 10));
  for (const a of aniversariantes) {
    const idade = Number(hoje.slice(0, 4)) - Number(String(a.nascimento).slice(0, 4));
    for (const p of profR.data ?? []) {
      await avisar({ userId: p.id, tipo: "aniversario", referencia: `${a.id}-${hoje.slice(0, 4)}`, titulo: `🎂 Hoje é aniversário de ${a.nome.split(" ")[0]}`, corpo: `${a.nome} faz ${idade} anos. Manda um parabéns!`, url: `/professor/alunos/${a.id}` });
    }
  }

  // Cobranças que vencem hoje (e as atrasadas): um aviso por dia no celular do professor
  const { data: cobr } = await admin.from("cobrancas").select("valor, vencimento, alunos(nome)").is("pago_em", null).lte("vencimento", hoje);
  const moeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const nomeCob = (c: { alunos: unknown }) => ((c.alunos as { nome: string } | null)?.nome ?? "Aluno").split(" ")[0];
  const vencemHoje = (cobr ?? []).filter((c) => c.vencimento === hoje);
  const atrasadasCob = (cobr ?? []).filter((c) => c.vencimento < hoje);
  if (vencemHoje.length || atrasadasCob.length) {
    const corpo = [
      vencemHoje.length ? `Hoje: ${vencemHoje.map((c) => `${nomeCob(c)} ${moeda(Number(c.valor))}`).join(", ")}` : null,
      atrasadasCob.length ? `${atrasadasCob.length} atrasada${atrasadasCob.length > 1 ? "s" : ""} (${moeda(atrasadasCob.reduce((t, c) => t + Number(c.valor), 0))})` : null,
    ].filter(Boolean).join(" · ");
    for (const p of profR.data ?? []) {
      await avisar({ userId: p.id, tipo: "cobrancas", referencia: hoje, titulo: vencemHoje.length ? "💰 Pagamentos vencendo hoje" : "💰 Pagamentos atrasados", corpo, url: "/professor/cobrancas" });
    }
  }

  // Resumo diário para o professor
  const porId = new Map((alunosR.data ?? []).map((a) => [a.id, a.nome as string]));
  const recebidos = [...new Set((recentesR.data ?? []).map((a) => a.aluno_id))].map((id) => porId.get(id)).filter(Boolean) as string[];
  const semResposta = acomps.filter((a) => !a.resposta_professor && porId.has(a.aluno_id)).length;
  const anamneses = [...new Set((anamR.data ?? []).map((a) => porId.get(a.aluno_id)).filter(Boolean))] as string[];

  const blocos: [string, string[]][] = [
    ["🎂 Aniversário hoje", aniversariantes.map((a) => a.nome as string)],
    ["💰 Pagamentos que vencem hoje", vencemHoje.map((c) => `${nomeCob(c)} · ${moeda(Number(c.valor))}`)],
    ["💰 Pagamentos atrasados", atrasadasCob.map((c) => `${nomeCob(c)} · ${moeda(Number(c.valor))} (venceu ${dataBR(c.vencimento)})`)],
    ["Acompanhamentos recebidos nas últimas 24h", recebidos],
    ["Entraram na semana 7", resumo.semana7],
    ["Anamneses para revisar", anamneses],
    ["Renovações nos próximos 30 dias", resumo.renovacao],
    ["Sem registro há mais de 10 dias", resumo.parados],
  ];
  const temAlgo = semResposta > 0 || blocos.some(([, l]) => l.length);
  let resumoEnviado = false;
  if (temAlgo && emailConfigurado()) {
    const corpo =
      `<p><strong>${semResposta}</strong> acompanhamento${semResposta === 1 ? "" : "s"} esperando resposta.</p>` +
      blocos.filter(([, l]) => l.length).map(([t, l]) => `<h3 style="margin:18px 0 6px;font-size:15px">${t}</h3><ul style="margin:0;padding-left:18px">${l.map((n) => `<li>${n}</li>`).join("")}</ul>`).join("");
    for (const p of profR.data ?? []) {
      const { data: u } = await admin.auth.admin.getUserById(p.id);
      if (u.user?.email) resumoEnviado = (await enviarEmail(u.user.email, `Resumo do dia · ${dataBR(hoje)}`, htmlEmail("Resumo do dia", corpo, { texto: "Abrir a tela Hoje", url: "/professor/hoje" })).catch(() => false)) || resumoEnviado;
    }
  }

  return NextResponse.json({ ok: true, hoje, enviados, resumoEnviado, emailConfigurado: emailConfigurado() });
}
