import { Trophy } from "lucide-react";
import { IconeBroche } from "@/components/icone-broche";
import { Barra } from "@/components/ui";
import { exigirAluno } from "@/lib/sessao";
import { carregarPainelAluno } from "@/lib/dados-aluno";
import { ligaPorPontos } from "@/lib/ligas";
import { dataBR } from "@/lib/formato";

const CATEGORIAS = [
  { id: "execucao", nome: "Execução" },
  { id: "evolucao", nome: "Evolução" },
  { id: "jornada", nome: "Jornada" },
];

export const metadata = { title: "Conquistas · Área do Aluno CA" };

export default async function Conquistas() {
  const s = await exigirAluno();
  const painel = await carregarPainelAluno(s.supabase, { userId: s.user.id });
  const [{ data: broches }, { data: minhas }] = await Promise.all([
    s.supabase.from("broches").select("*").order("ordem"),
    painel ? s.supabase.from("conquistas").select("broche, desbloqueada_em").eq("aluno_id", painel.aluno.id) : Promise.resolve({ data: [] }),
  ]);
  const ganhas = new Map((minhas ?? []).map((c) => [c.broche, c.desbloqueada_em as string]));
  const liga = ligaPorPontos(painel?.pontos ?? 0, painel?.faixas);

  return (
    <div className="mx-auto max-w-xl space-y-4 pt-2 lg:max-w-4xl">
      <h1 className="text-2xl font-bold">Conquistas</h1>

      <section className="rounded-2xl bg-menu p-5 text-white">
        <p className="flex items-center gap-2 text-sm text-white/70"><Trophy className="size-4" /> Liga atual</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="text-3xl font-bold">{liga.liga}</p>
          <p className="font-semibold text-white/80">{painel?.pontos ?? 0} pts</p>
        </div>
        <Barra valor={liga.progresso} className="mt-3 !bg-white/15" />
        <p className="mt-2 text-xs text-white/70">{liga.proxima ? `Faltam ${liga.faltam} pts pra ${liga.proxima}.` : "Topo da tabela."}</p>
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
    </div>
  );
}
