import Link from "next/link";
import { CalendarDays, Dumbbell, Flag, MessageSquareText, Shield, Sparkles, Trophy } from "lucide-react";
import type { PainelAluno } from "@/lib/dados-aluno";
import { situacaoDoCiclo, emRetaFinal, hojeEmBH, type SituacaoCiclo } from "@/lib/ciclo";
import { ligaPorPontos } from "@/lib/ligas";
import { dataBR, primeiroNome, saudacao } from "@/lib/formato";
import { DIAS } from "@/lib/tipos";
import { Barra, Cartao, TituloCartao, Vazio } from "./ui";
import { BotaoTreino } from "./botao-treino";
import { IconeBroche } from "./icone-broche";

function proximoPasso(p: PainelAluno, s: SituacaoCiclo, hoje: string) {
  const diaHoje = new Date(hoje + "T12:00:00Z").getUTCDay();
  const nomeApp = p.aluno.app_treino ? p.apps[p.aluno.app_treino].nome : null;

  if (s.tipo === "sem_ciclo") return { titulo: "Seu ciclo está sendo montado", texto: "Assim que eu fechar seu treino, ele aparece aqui com as datas." };
  if (s.tipo === "nao_iniciado")
    return { titulo: `Seu ciclo começa em ${s.diasParaComecar} ${s.diasParaComecar === 1 ? "dia" : "dias"}`, texto: "Instala o app de treino e dá uma olhada nos exercícios antes." };
  if (s.tipo === "encerrado") return { titulo: "Ciclo fechado", texto: "Hora da reavaliação. Me manda suas fotos e vamos montar o próximo." };
  if (s.pausado) return { titulo: "Ciclo pausado", texto: "Quando voltar, me avisa que eu retomo daqui." };
  if (emRetaFinal(s))
    return { titulo: `Semana ${s.semana}: reta final`, texto: "A reavaliação está chegando. Anota suas cargas e já separa as fotos." };
  if (p.aluno.dia_acompanhamento === diaHoje)
    return { titulo: "Hoje é dia de acompanhamento", texto: "Me conta como foi a semana: treinos, sono, energia e dúvidas." };
  return { titulo: "Treino de hoje", texto: nomeApp ? `Abre o ${nomeApp} e segue a ficha do dia.` : "Seu treino está com o Carlos. Já já ele aparece aqui." };
}

export function InicioAluno({ painel, preview = false }: { painel: PainelAluno; preview?: boolean }) {
  const hoje = hojeEmBH();
  const s = situacaoDoCiclo(painel.ciclo, hoje);
  const passo = proximoPasso(painel, s, hoje);
  const liga = ligaPorPontos(painel.pontos, painel.faixas);
  const app = painel.aluno.app_treino ? painel.apps[painel.aluno.app_treino] : null;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 lg:max-w-4xl">
      <header className="pt-2">
        <p className="text-sm text-texto-suave">{saudacao()},</p>
        <h1 className="text-2xl font-bold">{primeiroNome(painel.aluno.nome)}</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Semana do ciclo */}
        <Cartao>
          <TituloCartao icone={CalendarDays}>Seu ciclo</TituloCartao>
          {s.tipo === "em_andamento" ? (
            <>
              <p className="text-3xl font-bold">
                Semana {s.semana} <span className="text-lg font-semibold text-texto-suave">de {s.total}</span>
              </p>
              <Barra valor={s.progresso} className="mt-3" cor={emRetaFinal(s) ? "bg-alerta" : "bg-marca"} />
              <p className="mt-2 text-xs text-texto-suave">
                {dataBR(painel.ciclo!.inicio)} a {dataBR(painel.ciclo!.fim)}
                {s.pausado && " · pausado"}
              </p>
            </>
          ) : s.tipo === "nao_iniciado" ? (
            <p className="text-lg font-semibold">Começa em {dataBR(painel.ciclo!.inicio)}</p>
          ) : s.tipo === "encerrado" ? (
            <p className="text-lg font-semibold">Ciclo {painel.ciclo!.numero} concluído</p>
          ) : (
            <p className="text-texto-suave">Ainda sem ciclo ativo.</p>
          )}
          {painel.ciclo?.objetivo && (
            <p className="mt-3 flex items-start gap-2 text-sm">
              <Flag className="mt-0.5 size-4 shrink-0 text-marca" /> {painel.ciclo.objetivo}
            </p>
          )}
        </Cartao>

        {/* Próximo passo */}
        <section className="rounded-2xl bg-menu p-5 text-white ring-1 ring-marca/40">
          <p className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <Sparkles className="size-4" /> Seu próximo passo
          </p>
          <p className="mt-2 text-xl font-bold">{passo.titulo}</p>
          <p className="mt-1 text-sm text-white/80">{passo.texto}</p>
          {app && s.tipo !== "encerrado" && <BotaoTreino app={app} linkIndividual={painel.aluno.app_treino_link} className="mt-4" />}
        </section>
      </div>

      {painel.orientacao && (
        <Cartao>
          <TituloCartao icone={MessageSquareText}>Recado do Carlos</TituloCartao>
          <p className="whitespace-pre-line text-sm leading-relaxed">{painel.orientacao.texto}</p>
        </Cartao>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Liga e pontos */}
        <Cartao>
          <TituloCartao icone={Shield}>Liga e pontos</TituloCartao>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold">{liga.liga}</p>
            <p className="text-sm font-semibold text-texto-suave">{painel.pontos} pts</p>
          </div>
          <Barra valor={liga.progresso} className="mt-3" />
          <p className="mt-2 text-xs text-texto-suave">
            {liga.proxima ? `Faltam ${liga.faltam} pts pra ${liga.proxima}.` : "Você está no topo."} Pontos vêm de constância: treinar, mandar o acompanhamento e registrar a evolução.
          </p>
        </Cartao>

        {/* Treino */}
        <Cartao>
          <TituloCartao icone={Dumbbell}>Meu treino</TituloCartao>
          {app ? (
            <>
              <p className="text-sm text-texto-suave">Seus treinos ficam no {app.nome}. Toca para abrir.</p>
              <BotaoTreino app={app} linkIndividual={painel.aluno.app_treino_link} className="mt-3 !bg-menu hover:!bg-menu-item" />
            </>
          ) : (
            <Vazio icone={Dumbbell} titulo="App de treino ainda não definido">
              O Carlos vai te passar qual app usar. Assim que estiver certo, o atalho aparece aqui.
            </Vazio>
          )}
        </Cartao>
      </div>

      {/* Conquistas */}
      <Cartao>
        <TituloCartao icone={Trophy} acao={!preview && <Link href="/conquistas" className="text-sm font-semibold text-marca">Ver todas</Link>}>
          Últimas conquistas
        </TituloCartao>
        {painel.conquistas.length ? (
          <ul className="space-y-3">
            {painel.conquistas.map((c) => (
              <li key={c.broche} className="flex items-center gap-3">
                <IconeBroche icone={c.icone} raridade={c.raridade} tamanho="sm" />
                <div>
                  <p className="font-semibold">{c.nome}</p>
                  <p className="text-xs text-texto-suave">{dataBR(c.desbloqueada_em)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Vazio icone={Trophy} titulo="Sua primeira conquista está perto">
            Ela vem com o primeiro acompanhamento enviado.
          </Vazio>
        )}
      </Cartao>

      {painel.aluno.dia_acompanhamento != null && (
        <p className="pb-2 text-center text-xs text-texto-suave">Seu dia de acompanhamento: {DIAS[painel.aluno.dia_acompanhamento].toLowerCase()}.</p>
      )}
    </div>
  );
}
