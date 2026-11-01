import { ListChecks, Trophy } from "lucide-react";
import { IconeBroche } from "@/components/icone-broche";
import { Barra } from "@/components/ui";
import { exigirAluno } from "@/lib/sessao";
import { carregarPainelAluno } from "@/lib/dados-aluno";
import { ligaProtegida } from "@/lib/ligas";
import { dataBR } from "@/lib/formato";
import { NOME_ACAO_PONTOS, REGRAS_PADRAO, type Regras } from "@/lib/gamificacao";

const CATEGORIAS = [
  { id: "execucao", nome: "Execução" },
  { id: "evolucao", nome: "Evolução" },
  { id: "jornada", nome: "Jornada" },
];

export const metadata = { title: "Conquistas · Área do Aluno CA" };

export default async function Conquistas() {
  const s = await exigirAluno();
  const painel = await carregarPainelAluno(s.supabase, { userId: s.user.id });
  if (!painel) return null;

  const [{ data: broches }, { data: minhas }, { data: extrato }, { data: cfg }] = await Promise.all([
    s.supabase.from("broches").select("*").order("ordem"),
    s.supabase.from("conquistas").select("broche, desbloqueada_em").eq("aluno_id", painel.aluno.id),
    s.supabase.from("pontuacoes").select("id, acao, pontos, data").eq("aluno_id", painel.aluno.id).order("data", { ascending: false }).limit(10),
    s.supabase.from("configuracoes").select("valor").eq("chave", "regras_pontos").maybeSingle(),
  ]);
  const regras: Regras = { ...REGRAS_PADRAO, ...((cfg?.valor as Partial<Regras>) ?? {}) };
  const ganhas = new Map((minhas ?? []).map((c) => [c.broche, c.desbloqueada_em as string]));
  const liga = ligaProtegida(painel.pontos, painel.pontosInicioSemana, painel.faixas);

  return (
    <div className="mx-auto max-w-xl space-y-4 pt-2 lg:max-w-4xl">
      <h1 className="text-2xl font-bold">Conquistas</h1>

      <section className="rounded-2xl bg-menu p-5 text-white">
        <p className="flex items-center gap-2 text-sm text-white/70"><Trophy className="size-4" /> Liga atual</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="text-3xl font-bold">{liga.liga}</p>
          <p className="font-semibold text-white/80">{painel.pontos} pts</p>
        </div>
        <Barra valor={liga.progresso} className="mt-3 !bg-white/15" />
        <p className="mt-2 text-xs text-white/70">
          {liga.proxima ? `Faltam ${liga.faltam} pts pra ${liga.proxima}.` : "Topo da tabela."} Subiu de liga? Fica protegido até o fim da semana.
        </p>
      </section>

      {CATEGORIAS.map((cat) => (
        <section key={cat.id} className="cartao p-5">
          <h2 className="rotulo mb-3">{cat.nome}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(broches ?? [])
              .filter((b) => b.categoria === cat.id)
              .map((b) => {
                const data = ganhas.get(b.codigo);
                return (
                  <li key={b.codigo} className={`flex items-center gap-3 ${data ? "" : "opacity-45 grayscale"}`}>
                    <IconeBroche icone={b.icone} raridade={b.raridade} />
                    <div>
                      <p className="font-semibold">{b.nome}</p>
                      <p className="text-xs text-texto-suave">{data ? `Conquistado em ${dataBR(data)}` : b.descricao}</p>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="cartao p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><ListChecks className="size-5 text-marca" /> Como ganhar pontos</h2>
          <ul className="space-y-2 text-sm">
            {(Object.keys(NOME_ACAO_PONTOS) as (keyof Regras)[])
              .filter((k) => regras[k])
              .map((k) => (
                <li key={k} className="flex justify-between gap-3">
                  <span>{NOME_ACAO_PONTOS[k]}</span>
                  <span className={`font-bold ${regras[k] < 0 ? "text-perigo" : "text-ok"}`}>{regras[k] > 0 ? "+" : ""}{regras[k]}</span>
                </li>
              ))}
          </ul>
          <p className="mt-3 text-xs text-texto-suave">O jogo premia constância, não estética. Conta o que você controla.</p>
        </section>

        <section className="cartao p-5">
          <h2 className="mb-3 font-semibold">Últimos pontos</h2>
          {extrato?.length ? (
            <ul className="space-y-2 text-sm">
              {extrato.map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span>{NOME_ACAO_PONTOS[p.acao as keyof Regras] ?? p.acao} <span className="text-xs text-texto-suave">· {dataBR(p.data)}</span></span>
                  <span className={`font-bold ${p.pontos < 0 ? "text-perigo" : "text-ok"}`}>{p.pontos > 0 ? "+" : ""}{p.pontos}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-texto-suave">Seus primeiros pontos chegam com o primeiro acompanhamento.</p>
          )}
        </section>
      </div>
    </div>
  );
}
