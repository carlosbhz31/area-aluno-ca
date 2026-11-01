// Completa o cadastro com a base "Gestão de Clientes" do Notion (na v1 o Notion manda nas diferenças).
//
// Antes: crie uma integração interna em https://www.notion.so/profile/integrations, copie o token
// para NOTION_TOKEN no .env.local e conecte a base "Gestão de Clientes" a ela (••• > Conexões).
//
// Uso:
//   npm run importar:notion             (simulação: mostra o que mudaria)
//   npm run importar:notion -- --aplicar
//
// Como liga: pelo nome (sem acento, sem diferença de maiúsculas). A base do Notion não tem e-mail,
// então só completa alunos que já existem no sistema; quem não casar aparece pelo link da página.
// Não importa campos sensíveis (sinais de alerta, observações): eles continuam só no Notion.

import { aplicar, cabecalho, clienteAdmin, data, semAcento } from "./comum.ts";

type Prop = Record<string, unknown> & { type: string };
type Pagina = { id: string; url: string; properties: Record<string, Prop> };

const token = process.env.NOTION_TOKEN;
const baseId = process.env.NOTION_DATABASE_ID;
if (!token || !baseId) {
  console.error("Faltam NOTION_TOKEN e NOTION_DATABASE_ID no .env.local");
  process.exit(1);
}

async function lerBase(): Promise<Pagina[]> {
  const paginas: Pagina[] = [];
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
    const corpo = (await r.json()) as { results: Pagina[]; has_more: boolean; next_cursor: string | null };
    paginas.push(...corpo.results);
    cursor = corpo.has_more ? corpo.next_cursor ?? undefined : undefined;
  } while (cursor);
  return paginas;
}

// Leitura das propriedades do Notion
const titulo = (p?: Prop) => ((p?.title as { plain_text: string }[] | undefined) ?? []).map((t) => t.plain_text).join("").trim() || null;
const selecao = (p?: Prop) => (p?.select as { name: string } | null | undefined)?.name ?? null;
const dataProp = (p?: Prop) => data((p?.date as { start: string } | null | undefined)?.start);
const num = (p?: Prop) => (typeof p?.number === "number" ? (p.number as number) : null);
const url = (p?: Prop) => (typeof p?.url === "string" && p.url ? (p.url as string) : null);

function telefone(v: string | null) {
  if (!v) return null;
  const digitos = v.replace(/\D/g, "");
  return digitos.length >= 10 ? `+${digitos.length <= 11 ? "55" + digitos : digitos}` : null;
}

cabecalho("Importação do Notion (Gestão de Clientes)");
const admin = clienteAdmin();
const [paginas, { data: alunos, error }] = await Promise.all([lerBase(), admin.from("alunos").select("*")]);
if (error) throw error;

// Índice por nome normalizado (e por primeiro + último nome, quando for único)
const porNome = new Map<string, (typeof alunos)[number]>();
const porPrimeiroUltimo = new Map<string, (typeof alunos)[number] | null>();
for (const a of alunos ?? []) {
  const n = semAcento(a.nome);
  porNome.set(n, a);
  const partes = n.split(" ");
  const chave = `${partes[0]} ${partes[partes.length - 1]}`;
  porPrimeiroUltimo.set(chave, porPrimeiroUltimo.has(chave) ? null : a);
}

const total = { paginas: paginas.length, ligados: 0, alterados: 0, semAluno: 0, ignorados: 0 };
const semAluno: string[] = [];

for (const p of paginas) {
  const props = p.properties;
  const nome = titulo(props["Nome"]);
  if (!nome) { total.ignorados++; continue; }

  // Só quem é (ou foi) cliente de consultoria
  const status = selecao(props["Status"]);
  const servico = selecao(props["Serviço"]);
  if (servico === "Presencial" || (status && !/cliente|perdido/i.test(status))) { total.ignorados++; continue; }

  const n = semAcento(nome);
  const partes = n.split(" ");
  const aluno = porNome.get(n) ?? porPrimeiroUltimo.get(`${partes[0]} ${partes[partes.length - 1]}`) ?? null;
  if (!aluno) { total.semAluno++; semAluno.push(p.url); continue; }
  total.ligados++;

  const programa = selecao(props["Programa Contratado"]);
  const mudancas: Record<string, unknown> = {
    notion_page_id: p.id,
    nascimento: dataProp(props["Data de nascimento"]),
    valor_contratado: num(props["Valor do programa"]),
    inicio: dataProp(props["Início do Contrato"]),
    fim: dataProp(props["Final do Contrato"]),
    tempo_contratado: selecao(props["Tempo Contratado"]),
    telefone: telefone(url(props["Whatsapp"])),
    plano: programa ? (/light/i.test(programa) ? "light" : "premium") : null,
    situacao: status && /perdido/i.test(status) ? "inativo" : null,
    app_treino: !aluno.app_treino && url(props["Perfil MFIT"]) ? "mfit" : null,
  };
  // Notion manda: sobrescreve o que veio preenchido lá; campos vazios no Notion não apagam nada.
  const diferentes = Object.fromEntries(Object.entries(mudancas).filter(([k, v]) => v != null && String(aluno[k] ?? "") !== String(v)));

  if (Object.keys(diferentes).length) {
    total.alterados++;
    console.log(`página ${p.id.slice(0, 8)}…: ${Object.keys(diferentes).join(", ")}`);
    if (aplicar) {
      const { error: e } = await admin.from("alunos").update(diferentes).eq("id", aluno.id);
      if (e) console.log(`  erro: ${e.message}`);
    }
  }

  // Link do prontuário vai para o ciclo ativo, se ainda não tiver
  const prontuario = url(props["Prontuário técnico"]);
  if (prontuario && aplicar) {
    await admin.from("ciclos").update({ link_prontuario: prontuario }).eq("aluno_id", aluno.id).eq("ativo", true).is("link_prontuario", null);
  }
}

console.log("-".repeat(60));
console.log(`Páginas: ${total.paginas} | ligadas a alunos: ${total.ligados} | com mudanças: ${total.alterados} | ignoradas (leads/presencial): ${total.ignorados}`);
if (semAluno.length) {
  console.log(`\n${semAluno.length} página(s) de cliente sem aluno correspondente. Confira o nome ou cadastre o aluno:`);
  semAluno.forEach((u) => console.log(`  ${u}`));
}
