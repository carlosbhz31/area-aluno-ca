import Link from "next/link";
import { AlertTriangle, Plus, Search, UserCheck, UserMinus, PauseCircle, Users } from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { situacaoDoCiclo } from "@/lib/ciclo";
import { alertasDoAluno } from "@/lib/atencao";
import { dataBR, iniciais } from "@/lib/formato";
import { NOME_APP, NOME_PLANO, NOME_SITUACAO, type Aluno, type Ciclo } from "@/lib/tipos";
import { Barra, Selo, Vazio } from "@/components/ui";

export const metadata = { title: "Alunos · Painel do Professor" };

type Filtros = { q?: string; situacao?: string; plano?: string; app?: string; atencao?: string };

function semAcento(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default async function Alunos({ searchParams }: { searchParams: Promise<Filtros> }) {
  const f = await searchParams;
  const { supabase } = await exigirProfessor();

  const { data, error } = await supabase.from("alunos").select("*, ciclos(*)").order("nome");
  const todos = (data ?? []).map((a) => {
    const { ciclos, ...aluno } = a as Aluno & { ciclos: Ciclo[] };
    const ciclo = ciclos.find((c) => c.ativo) ?? null;
    return { aluno: aluno as Aluno, ciclo, alertas: alertasDoAluno(aluno as Aluno, ciclo) };
  });

  const lista = todos.filter(({ aluno, alertas }) => {
    if (f.q && !semAcento(`${aluno.nome} ${aluno.email}`).includes(semAcento(f.q))) return false;
    if (f.situacao && aluno.situacao !== f.situacao) return false;
    if (f.plano && aluno.plano !== f.plano) return false;
    if (f.app === "nenhum" ? aluno.app_treino : f.app && aluno.app_treino !== f.app) return false;
    if (f.atencao && !alertas.length) return false;
    return true;
  });

  const conta = (s: string) => todos.filter((t) => t.aluno.situacao === s).length;
  const indicadores = [
    { rotulo: "Ativos", valor: conta("ativo"), icone: UserCheck, cor: "text-ok" },
    { rotulo: "Pausados", valor: conta("pausado"), icone: PauseCircle, cor: "text-alerta" },
    { rotulo: "Inativos", valor: conta("inativo"), icone: UserMinus, cor: "text-texto-suave" },
    { rotulo: "Precisam de atenção", valor: todos.filter((t) => t.alertas.length).length, icone: AlertTriangle, cor: "text-perigo" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Alunos</h1>
          <p className="text-sm text-texto-suave">{todos.length} cadastrados</p>
        </div>
        <Link href="/professor/alunos/novo" className="botao"><Plus className="size-4" /> Novo aluno</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map(({ rotulo, valor, icone: Icone, cor }) => (
          <div key={rotulo} className="cartao flex items-center gap-3 p-4">
            <Icone className={`size-6 ${cor}`} />
            <div>
              <p className="text-2xl font-bold leading-none">{valor}</p>
              <p className="mt-1 text-xs text-texto-suave">{rotulo}</p>
            </div>
          </div>
        ))}
      </div>

      <form className="cartao flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-56 flex-1">
          <span className="rotulo">Buscar</span>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-suave" />
            <input name="q" defaultValue={f.q} placeholder="Nome ou e-mail" className="campo pl-9" />
          </div>
        </label>
        <Seletor nome="situacao" rotulo="Situação" valor={f.situacao} opcoes={[["ativo", "Ativo"], ["pausado", "Pausado"], ["inativo", "Inativo"]]} />
        <Seletor nome="plano" rotulo="Plano" valor={f.plano} opcoes={[["premium", "Premium"], ["light", "Light"]]} />
        <Seletor nome="app" rotulo="App de treino" valor={f.app} opcoes={[["mfit", "MFit"], ["treinoio", "treino.io"], ["nenhum", "Sem app"]]} />
        <label className="flex items-center gap-2 pb-3 text-sm">
          <input type="checkbox" name="atencao" value="1" defaultChecked={!!f.atencao} className="size-4 accent-[var(--marca)]" />
          Precisa de atenção
        </label>
        <button className="botao-secundario">Filtrar</button>
        {Object.values(f).some(Boolean) && <Link href="/professor/alunos" className="pb-3 text-sm text-texto-suave underline">Limpar</Link>}
      </form>

      {error && <p className="text-sm text-perigo">Não consegui carregar os alunos. Atualiza a página.</p>}

      {lista.length === 0 ? (
        <div className="cartao p-5">
          <Vazio icone={Users} titulo={todos.length ? "Ninguém com esses filtros" : "Nenhum aluno ainda"}>
            {todos.length ? "Tenta tirar algum filtro." : "Rode a importação do sistema antigo ou cadastre o primeiro aluno no botão Novo aluno."}
          </Vazio>
        </div>
      ) : (
        <div className="cartao overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-borda text-left">
                {["Aluno", "Plano", "Situação", "App", "Ciclo", "Contrato até", "Atenção"].map((t) => (
                  <th key={t} className="rotulo px-4 py-3 font-semibold">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(({ aluno, ciclo, alertas }) => {
                const s = situacaoDoCiclo(ciclo);
                return (
                  <tr key={aluno.id} className="border-b border-borda last:border-0 hover:bg-fundo">
                    <td className="px-4 py-3">
                      <Link href={`/professor/alunos/${aluno.id}`} className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-marca-suave text-xs font-bold text-marca">{iniciais(aluno.nome)}</span>
                        <span>
                          <span className="block font-semibold hover:text-marca">{aluno.nome}</span>
                          <span className="block text-xs text-texto-suave">{aluno.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><Selo tom={aluno.plano === "premium" ? "marca" : "neutro"}>{NOME_PLANO[aluno.plano]}</Selo></td>
                    <td className="px-4 py-3"><Selo tom={aluno.situacao === "ativo" ? "ok" : aluno.situacao === "pausado" ? "alerta" : "neutro"}>{NOME_SITUACAO[aluno.situacao]}</Selo></td>
                    <td className="px-4 py-3">{aluno.app_treino ? NOME_APP[aluno.app_treino] : <span className="text-texto-suave">—</span>}</td>
                    <td className="w-40 px-4 py-3">
                      {s.tipo === "em_andamento" ? (
                        <>
                          <span className="text-xs font-semibold">Semana {s.semana}/{s.total}</span>
                          <Barra valor={s.progresso} className="mt-1 !h-1.5" cor={s.semana >= s.total - 1 ? "bg-alerta" : "bg-marca"} />
                        </>
                      ) : (
                        <span className="text-xs text-texto-suave">{s.tipo === "encerrado" ? "Encerrado" : s.tipo === "nao_iniciado" ? "Não começou" : "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-texto-suave">{dataBR(aluno.fim)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {alertas.map((a) => <Selo key={a.texto} tom={a.tom}>{a.texto}</Selo>)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Seletor({ nome, rotulo, valor, opcoes }: { nome: string; rotulo: string; valor?: string; opcoes: [string, string][] }) {
  return (
    <label>
      <span className="rotulo">{rotulo}</span>
      <select name={nome} defaultValue={valor ?? ""} className="campo mt-1 !w-40">
        <option value="">Todos</option>
        {opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );
}
