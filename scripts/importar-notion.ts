// Completa o cadastro com a base "Gestão de Clientes" do Notion (na v1 o Notion manda nas diferenças).
//
// Duas fontes possíveis:
//   1) Arquivo extraído do Notion (dados/notion-gestao-clientes.json, fora do Git):
//        npm run importar:notion -- --arquivo dados/notion-gestao-clientes.json [--aplicar]
//   2) API do Notion: crie uma integração interna em https://www.notion.so/profile/integrations,
//      coloque o token em NOTION_TOKEN no .env.local e conecte a base a ela (••• > Conexões):
//        npm run importar:notion [-- --aplicar]
//
// Sem --aplicar é só simulação. Liga pelo nome (sem acento; aceita nome do meio faltando e letra dobrada).
// A base do Notion não tem e-mail: só completa alunos que já existem; quem não casar aparece pelo link.
// "Protocolo atual" + "Início do Protocolo" viram o ciclo ativo do aluno.
// Não importa campos sensíveis (sinais de alerta, observações): eles continuam só no Notion.

import { readFileSync } from "node:fs";
import { aplicar, argumento, cabecalho, clienteAdmin, data, semAcento } from "./comum.ts";

type Registro = {
  pageId: string;
  url: string;
  nome: string;
  status: string | null;
  servico: string | null;
  programa: string | null;
  valor: number | null;
  tempo: string | null;
  inicioContrato: string | null;
  fimContrato: string | null;
  nascimento: string | null;
  whatsapp: string | null;
  perfilMfit: string | null;
  prontuario: string | null;
  inicioProtocolo: string | null;
  protocolo: string | null;
};

function idDaUrl(url: string): string {
  const hex = url.replace(/-/g, "").match(/[0-9a-f]{32}/i)?.[0] ?? "";
  return hex ? `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` : url;
}

// Fonte 1: arquivo ----------------------------------------------------------------

function lerArquivo(caminho: string): Registro[] {
  const bruto = JSON.parse(readFileSync(caminho, "utf8")) as { colunas: string[]; linhas: unknown[][] };
  return bruto.linhas.map((l) => {
    const r = Object.fromEntries(bruto.colunas.map((c, i) => [c, l[i] ?? null])) as Record<string, string | number | null>;
    const s = (k: string) => (r[k] == null || r[k] === "" ? null : String(r[k]));
    return {
      pageId: idDaUrl(String(r.url)),
      url: String(r.url),
      nome: String(r.nome ?? ""),
      status: s("status"),
      servico: s("servico"),
      programa: s("programa"),
      valor: typeof r.valor === "number" ? r.valor : null,
      tempo: s("tempo"),
      inicioContrato: data(s("inicio_contrato")),
      fimContrato: data(s("fim_contrato")),
      nascimento: data(s("nascimento")),
      whatsapp: s("whatsapp"),
      perfilMfit: s("perfil_mfit"),
      prontuario: s("prontuario"),
      inicioProtocolo: data(s("inicio_protocolo")),
      protocolo: s("protocolo"),
    };
  });
}

// Fonte 2: API do Notion -------------------------------------------------------

type Prop = Record<string, unknown> & { type: string };
const titulo = (p?: Prop) => ((p?.title as { plain_text: string }[] | undefined) ?? []).map((t) => t.plain_text).join("").trim();
const selecao = (p?: Prop) => (p?.select as { name: string } | null | undefined)?.name ?? null;
const dataProp = (p?: Prop) => data((p?.date as { start: string } | null | undefined)?.start);
const num = (p?: Prop) => (typeof p?.number === "number" ? (p.number as number) : null);
const url = (p?: Prop) => (typeof p?.url === "string" && p.url ? (p.url as string) : null);

async function lerApi(): Promise<Registro[]> {
  const token = process.env.NOTION_TOKEN;
  const baseId = process.env.NOTION_DATABASE_ID;
  if (!token || !baseId) {
    console.error("Sem --arquivo: faltam NOTION_TOKEN e NOTION_DATABASE_ID no .env.local");
    process.exit(1);
  }
  const paginas: { id: string; url: string; properties: Record<string, Prop> }[] = [];
  let cursor: string | undefined;
  do {
    const r = await fetch(`https://api.notion.com/v1/databases/${baseId}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
    });
    if (!r.ok) {
      console.error(`Notion respondeu ${r.status}. Confere o token e se a base está conectada à integração.`);
      process.exit(1);
    }
    const corpo = (await r.json()) as { results: typeof paginas; has_more: boolean; next_cursor: string | null };
    paginas.push(...corpo.results);
    cursor = corpo.has_more ? corpo.next_cursor ?? undefined : undefined;
  } while (cursor);

  return paginas.map(({ id, url: link, properties: p }) => ({
    pageId: id,
    url: link,
    nome: titulo(p["Nome"]),
    status: selecao(p["Status"]),
    servico: selecao(p["Serviço"]),
    programa: selecao(p["Programa Contratado"]),
    valor: num(p["Valor do programa"]),
    tempo: selecao(p["Tempo Contratado"]),
    inicioContrato: dataProp(p["Início do Contrato"]),
    fimContrato: dataProp(p["Final do Contrato"]),
    nascimento: dataProp(p["Data de nascimento"]),
    whatsapp: url(p["Whatsapp"]),
    perfilMfit: url(p["Perfil MFIT"]),
    prontuario: url(p["Prontuário técnico"]),
    inicioProtocolo: dataProp(p["Início do Protocolo"]),
    protocolo: selecao(p["Protocolo atual"]),
  }));
}

// Comparação de nomes ----------------------------------------------------------

const LIGACOES = new Set(["da", "de", "do", "das", "dos", "e"]);
function tokens(nome: string): string[] {
  return semAcento(nome.replace(/\(.*?\)/g, " "))
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !LIGACOES.has(t))
    .map((t) => t.replace(/(.)\1+/g, "$1")); // Daniella = Daniela
}

/** Mesmo primeiro nome e todos os outros nomes do mais curto aparecem no mais longo. */
function mesmoNome(a: string, b: string): boolean {
  const [ta, tb] = [tokens(a), tokens(b)];
  if (!ta.length || !tb.length || ta[0] !== tb[0]) return false;
  const [curto, longo] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return curto.slice(1).every((t) => longo.includes(t));
}

function telefone(v: string | null) {
  if (!v) return null;
  const digitos = v.replace(/\D/g, "");
  return digitos.length >= 10 ? `+${digitos.length <= 11 ? "55" + digitos : digitos}` : null;
}

// Importação -------------------------------------------------------------------

const arquivo = argumento("--arquivo");
cabecalho(`Importação do Notion (Gestão de Clientes) — fonte: ${arquivo ? "arquivo" : "API"}`);
const admin = clienteAdmin();
const registros = arquivo ? lerArquivo(arquivo) : await lerApi();
const { data: alunos, error } = await admin.from("alunos").select("*");
if (error) throw error;

const total = { registros: registros.length, ligados: 0, alterados: 0, ciclos: 0, ignorados: 0 };
const semAluno: string[] = [];
const usados = new Set<string>();

for (const r of registros) {
  if (!r.nome || r.servico === "Presencial" || (r.status && !/cliente|perdido/i.test(r.status))) {
    total.ignorados++;
    continue;
  }

  const candidatos = (alunos ?? []).filter((a) => mesmoNome(a.nome, r.nome));
  const aluno = candidatos.length === 1 ? candidatos[0] : null;
  if (!aluno) {
    if (r.status && /cliente/i.test(r.status)) semAluno.push(r.url);
    else total.ignorados++; // ex-cliente que não está no sistema: tudo bem
    continue;
  }
  total.ligados++;
  usados.add(aluno.id);

  const mudancas: Record<string, unknown> = {
    notion_page_id: r.pageId,
    nascimento: r.nascimento,
    valor_contratado: r.valor,
    inicio: r.inicioContrato,
    fim: r.fimContrato,
    tempo_contratado: r.tempo,
    telefone: telefone(r.whatsapp),
    plano: r.programa ? (/light/i.test(r.programa) ? "light" : "premium") : null,
    situacao: r.status && /perdido/i.test(r.status) ? "inativo" : null,
    app_treino: !aluno.app_treino && r.perfilMfit ? "mfit" : null,
  };
  // Notion manda: sobrescreve o que veio preenchido lá; campo vazio no Notion não apaga nada.
  const diferentes = Object.fromEntries(Object.entries(mudancas).filter(([k, v]) => v != null && String(aluno[k] ?? "") !== String(v)));
  if (Object.keys(diferentes).length) {
    total.alterados++;
    console.log(`aluno ${aluno.id.slice(0, 8)}: ${Object.keys(diferentes).join(", ")}`);
    if (aplicar) {
      const { error: e } = await admin.from("alunos").update(diferentes).eq("id", aluno.id);
      if (e) console.log(`  erro: ${e.message}`);
    }
  }

  // Ciclo ativo a partir do protocolo atual
  const numero = Number(r.protocolo?.match(/\d+/)?.[0]);
  if (r.inicioProtocolo && numero && !(r.status && /perdido/i.test(r.status))) {
    const { data: ativo } = await admin.from("ciclos").select("*").eq("aluno_id", aluno.id).eq("ativo", true).maybeSingle();
    const igual = ativo && ativo.numero === numero && ativo.inicio === r.inicioProtocolo;
    if (!igual) {
      total.ciclos++;
      console.log(`aluno ${aluno.id.slice(0, 8)}: ciclo ${numero} a partir de ${r.inicioProtocolo}`);
      if (aplicar) {
        if (ativo && ativo.numero === numero) {
          await admin.from("ciclos").update({ inicio: r.inicioProtocolo, link_prontuario: ativo.link_prontuario ?? r.prontuario }).eq("id", ativo.id);
        } else {
          if (ativo) await admin.from("ciclos").update({ ativo: false }).eq("id", ativo.id);
          await admin.from("ciclos").delete().eq("aluno_id", aluno.id).eq("numero", numero); // evita número repetido
          const { error: e } = await admin.from("ciclos").insert({ aluno_id: aluno.id, numero, inicio: r.inicioProtocolo, link_prontuario: r.prontuario, ativo: true });
          if (e) console.log(`  erro no ciclo: ${e.message}`);
        }
      }
    }
  }
}

const alunosSemNotion = (alunos ?? []).filter((a) => !usados.has(a.id));
console.log("-".repeat(60));
console.log(`Registros: ${total.registros} | ligados: ${total.ligados} | com mudanças: ${total.alterados} | ciclos criados/ajustados: ${total.ciclos} | ignorados: ${total.ignorados}`);
if (semAluno.length) {
  console.log(`\n${semAluno.length} cliente(s) do Notion sem aluno no sistema (cadastre com e-mail ou confira o nome):`);
  semAluno.forEach((u) => console.log(`  ${u}`));
}
if (alunosSemNotion.length) {
  console.log(`\n${alunosSemNotion.length} aluno(s) do sistema sem página no Notion (ids): ${alunosSemNotion.map((a) => a.id.slice(0, 8)).join(", ")}`);
}
