// Importa os alunos e as configurações do sistema antigo (Área do Aluno CA feita no ChatGPT).
//
// Uso:
//   npm run importar:gpt -- --arquivo dados/export-area-aluno-ca-2026-10-31.json --verificar
//   npm run importar:gpt -- --arquivo dados/export-area-aluno-ca-2026-10-31.json            (simulação)
//   npm run importar:gpt -- --arquivo dados/export-area-aluno-ca-2026-10-31.json --aplicar  (grava)
//
// Opções: --sem-login (não cria o login dos alunos), --sem-pilotos (pula alunos marcados como piloto)
// Regras: o arquivo fica fora do Git (pasta dados/). Nada de nome ou e-mail é impresso.
// Aluno que já existe só tem campos vazios preenchidos: o Notion é quem manda nas diferenças.

import { readFileSync } from "node:fs";
import { aplicar, argumento, cabecalho, clienteAdmin, data, garantirLogin } from "./comum.ts";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

const caminho = argumento("--arquivo");
if (!caminho) {
  console.error("Informe o arquivo: --arquivo dados/export-area-aluno-ca-2026-10-31.json");
  process.exit(1);
}
const exportacao = JSON.parse(readFileSync(caminho, "utf8")) as Obj;
const alunos = (Array.isArray(exportacao.students) ? exportacao.students : []) as Obj[];
const detalhes = obj(exportacao.details);

// --verificar: mostra só a estrutura (quais campos existem e quantos alunos têm cada um)
if (process.argv.includes("--verificar")) {
  const contar = (lista: Obj[]) => {
    const c: Record<string, number> = {};
    lista.forEach((o) => Object.entries(o).forEach(([k, v]) => v != null && v !== "" && (c[k] = (c[k] ?? 0) + 1)));
    return c;
  };
  const settings = alunos.map((a) => obj(obj(obj(obj(detalhes[String(a.id)]).dashboard).profile).settings));
  const entradas = alunos.flatMap((a) => {
    const e = obj(obj(detalhes[String(a.id)]).dashboard).entries;
    return Array.isArray(e) ? (e as Obj[]) : Object.values(obj(e)).flatMap((x) => (Array.isArray(x) ? (x as Obj[]) : [obj(x)]));
  });
  console.log(`Alunos: ${alunos.length} | detalhes: ${Object.keys(detalhes).length}`);
  console.log("Campos em students[] (alunos com valor):", contar(alunos));
  console.log("Campos em settings:", contar(settings));
  console.log(`Registros em entries: ${entradas.length}; campos:`, contar(entradas));
  console.log("Valores de platform:", [...new Set(settings.map((s) => String(s.platform ?? "")))]);
  console.log("Valores de plan:", [...new Set(alunos.map((a) => String(a.plan ?? "")))]);
  console.log("Valores de status:", [...new Set(alunos.map((a) => String(a.status ?? "")))]);
  console.log("Valores de checkinDay:", [...new Set(settings.map((s) => String(s.checkinDay ?? "")))]);
  process.exit(0);
}

// Conversões -------------------------------------------------------------------

function appTreino(v: unknown): "mfit" | "treinoio" | null {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("mfit")) return "mfit";
  if (s.replace(/[\s._-]/g, "").includes("treinoio")) return "treinoio";
  return null;
}

const DIAS: Record<string, number> = {
  dom: 0, domingo: 0, sun: 0, sunday: 0,
  seg: 1, segunda: 1, mon: 1, monday: 1,
  ter: 2, terca: 2, tue: 2, tuesday: 2,
  qua: 3, quarta: 3, wed: 3, wednesday: 3,
  qui: 4, quinta: 4, thu: 4, thursday: 4,
  sex: 5, sexta: 5, fri: 5, friday: 5,
  sab: 6, sabado: 6, sat: 6, saturday: 6,
};
function diaSemana(v: unknown): number | null {
  if (typeof v === "number" && v >= 0 && v <= 6) return v;
  const s = String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/-feira/, "").trim();
  if (/^[0-6]$/.test(s)) return Number(s);
  return DIAS[s] ?? DIAS[s.slice(0, 3)] ?? null;
}

function telefone(contato: unknown): string | null {
  const s = str(contato);
  if (!s) return null;
  const m = s.match(/wa\.me\/(\d{10,13})|phone=(\d{10,13})/);
  return m ? `+${m[1] ?? m[2]}` : /^\+?\d[\d\s()-]{8,}$/.test(s) ? s : null;
}

function situacao(a: Obj, st: Obj): "ativo" | "inativo" | "pausado" {
  const status = String(a.status ?? "").toLowerCase();
  if (a.ended === true || /inativ|encerr|ended|cancel/.test(status)) return "inativo";
  if (a.paused === true || st.cyclePaused === true || /paus/.test(status)) return "pausado";
  return "ativo";
}

function pesos(entries: unknown): { data: string; peso: number }[] {
  const lista: Obj[] = Array.isArray(entries)
    ? (entries as Obj[])
    : Object.values(obj(entries)).flatMap((x) => (Array.isArray(x) ? (x as Obj[]) : [obj(x)]));
  return lista
    .map((e) => {
      const tipo = String(e.type ?? e.kind ?? e.metric ?? "").toLowerCase();
      const carga = obj(e.payload); // formato do export: { kind: "weight", payload: { date, kg } }
      const valor = Number(carga.kg ?? e.weight ?? e.peso ?? (/(weight|peso)/.test(tipo) ? e.value : undefined));
      const d = data(carga.date ?? e.date ?? e.data ?? e.createdAt ?? e.at);
      return Number.isFinite(valor) && valor > 20 && valor < 400 && d ? { data: d, peso: valor } : null;
    })
    .filter((x): x is { data: string; peso: number } => x !== null);
}

// Importação -------------------------------------------------------------------

cabecalho("Importação do sistema antigo (GPT)");
const admin = clienteAdmin();
const pularPilotos = process.argv.includes("--sem-pilotos");
const semLogin = process.argv.includes("--sem-login");
const total = { lidos: 0, novos: 0, atualizados: 0, pulados: 0, semEmail: 0, ciclos: 0, pesos: 0, notas: 0, orientacoes: 0, logins: 0, erros: 0 };
const apps: Record<string, number> = { mfit: 0, treinoio: 0, vazio: 0 };

for (const [i, a] of alunos.entries()) {
  total.lidos++;
  const rotulo = `aluno #${i + 1}`;
  if (pularPilotos && a.isPilot === true) { total.pulados++; continue; }

  const email = str(a.email)?.toLowerCase();
  const nome = str(a.fullName);
  if (!email || !nome) { total.semEmail++; console.log(`${rotulo}: sem nome ou e-mail, pulado`); continue; }

  const det = obj(detalhes[String(a.id)]);
  const painel = obj(det.dashboard);
  const st = obj(obj(painel.profile).settings);
  const app = appTreino(st.platform ?? a.trainingKey);
  apps[app ?? "vazio"]++;

  const novo = {
    nome,
    email,
    origem_id: String(a.id),
    situacao: situacao(a, st),
    plano: /light/i.test(String(a.plan ?? "")) ? "light" : "premium",
    objetivo: str(a.mainGoal),
    app_treino: app,
    app_treino_link: str(st.trainingUrl),
    inicio: data(st.contractStart),
    fim: data(st.contractEnd),
    dia_acompanhamento: diaSemana(st.checkinDay),
    nutricionista: str(st.nutritionist),
    renovacao_plano_alimentar: data(st.nutritionRenewal) ?? data(a.renewalDue),
    telefone: telefone(st.contactUrl),
    tem_nutricao: st.nutrition === true || a.nutrition === true,
  };

  try {
    // Já existe? (pelo id antigo ou pelo e-mail)
    const { data: existente } = await admin
      .from("alunos")
      .select("*")
      .or(`origem_id.eq."${novo.origem_id}",email.eq."${email}"`)
      .maybeSingle();

    let alunoId: string;
    if (existente) {
      const preencher = Object.fromEntries(
        Object.entries(novo).filter(([k, v]) => v != null && (existente[k] == null || existente[k] === "")),
      );
      // tem_nutricao nasce false no banco: só liga, nunca desliga
      if (novo.tem_nutricao && !existente.tem_nutricao) preencher.tem_nutricao = true;
      alunoId = existente.id;
      if (Object.keys(preencher).length) {
        total.atualizados++;
        if (aplicar) {
          const { error } = await admin.from("alunos").update(preencher).eq("id", alunoId);
          if (error) throw error;
        }
      }
    } else {
      total.novos++;
      if (!aplicar) continue;
      const { data: criado, error } = await admin.from("alunos").insert(novo).select("id").single();
      if (error) throw error;
      alunoId = criado.id;
    }
    if (!aplicar) continue;

    if (!semLogin) { await garantirLogin(admin, email); total.logins++; }

    // Ciclo atual
    const inicioCiclo = data(st.cycleStart);
    if (inicioCiclo) {
      const { count } = await admin.from("ciclos").select("id", { count: "exact", head: true }).eq("aluno_id", alunoId);
      if (!count) {
        const semanas = Number(st.cycleWeeks) || 8;
        const { error } = await admin.from("ciclos").insert({
          aluno_id: alunoId,
          numero: 1,
          inicio: inicioCiclo,
          semanas: Math.min(Math.max(semanas, 1), 52),
          pausado_desde: st.cyclePaused === true ? data(st.cyclePauseDate) : null,
          dias_pausados: Math.max(0, Number(st.cyclePausedDays) || 0),
          objetivo: novo.objetivo,
        });
        if (error) throw error;
        total.ciclos++;
      }
    }

    // Registros de peso
    for (const p of pesos(painel.entries)) {
      const { count } = await admin.from("registros_evolucao").select("id", { count: "exact", head: true }).eq("aluno_id", alunoId).eq("data", p.data);
      if (!count) {
        const { error } = await admin.from("registros_evolucao").insert({ aluno_id: alunoId, data: p.data, peso: p.peso });
        if (error) throw error;
        total.pesos++;
      }
    }

    // Notas do sistema antigo viram anotação interna (só o professor vê)
    const notas = str(a.notes);
    if (notas) {
      const texto = `Do sistema antigo: ${notas}`;
      const { count } = await admin.from("anotacoes_internas").select("id", { count: "exact", head: true }).eq("aluno_id", alunoId).eq("texto", texto);
      if (!count) { await admin.from("anotacoes_internas").insert({ aluno_id: alunoId, texto, autor: null }); total.notas++; }
    }

    // Recado da semana vira orientação para o aluno
    const recado = str(st.weeklyNote);
    if (recado) {
      const { count } = await admin.from("orientacoes").select("id", { count: "exact", head: true }).eq("aluno_id", alunoId).eq("texto", recado);
      if (!count) { await admin.from("orientacoes").insert({ aluno_id: alunoId, texto: recado }); total.orientacoes++; }
    }
  } catch (e) {
    total.erros++;
    console.log(`${rotulo}: erro (${(e as Error).message})`);
  }
}

console.log("-".repeat(60));
console.log(`Lidos: ${total.lidos} | novos: ${total.novos} | com campos preenchidos: ${total.atualizados} | pulados: ${total.pulados} | sem e-mail: ${total.semEmail}`);
console.log(`Apps: MFit ${apps.mfit} | treino.io ${apps.treinoio} | vazio ${apps.vazio}`);
if (aplicar) console.log(`Ciclos: ${total.ciclos} | pesos: ${total.pesos} | notas: ${total.notas} | recados: ${total.orientacoes} | logins: ${total.logins} | erros: ${total.erros}`);
console.log("Fichas de treino e sessões do GPT não são importadas na v1 (ficam guardadas no arquivo).");
