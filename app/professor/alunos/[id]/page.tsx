import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, CalendarDays, CheckCircle2, Circle, ClipboardList, Eye, FileText, History, LineChart, NotebookPen, Pause, Play, Salad,
  ScrollText, ShieldCheck, Trophy, UserCog, ExternalLink,
} from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/servidor";
import { situacaoDoCiclo } from "@/lib/ciclo";
import { alertasDoAluno } from "@/lib/atencao";
import { dataBR, moedaBR } from "@/lib/formato";
import { NOME_APP, NOME_PLANO, NOME_SITUACAO, type Aluno, type Ciclo } from "@/lib/tipos";
import { Barra, Cartao, Selo, TituloCartao, Vazio } from "@/components/ui";
import { FormAnotacao, FormCadastro, FormCiclo } from "@/components/professor/formularios";
import { adicionarAnotacao, editarCiclo, novoCiclo, pausarOuRetomarCiclo, salvarCadastro } from "../../acoes";

export const metadata = { title: "Ficha do aluno · Painel do Professor" };

const NOME_TABELA: Record<string, string> = {
  alunos: "Cadastro",
  ciclos: "Ciclo",
  anotacoes_internas: "Anotação",
  contratos: "Contrato",
  anamneses: "Anamnese",
  acompanhamentos: "Acompanhamento",
  registros_evolucao: "Evolução",
  documentos: "Documento",
  orientacoes: "Orientação",
};
const NOME_ACAO: Record<string, string> = { insert: "criado", update: "alterado", delete: "removido" };

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirProfessor();

  const { data: aluno } = await supabase.from("alunos").select("*").eq("id", id).maybeSingle<Aluno>();
  if (!aluno) notFound();

  const [ciclos, anotacoes, contratos, anamneses, acompanhamentos, evolucao, documentos, pontos, conquistas, historico] = await Promise.all([
    supabase.from("ciclos").select("*").eq("aluno_id", id).order("numero", { ascending: false }),
    supabase.from("anotacoes_internas").select("id, texto, criada_em").eq("aluno_id", id).order("criada_em", { ascending: false }).limit(20),
    supabase.from("contratos").select("id, data, assinado").eq("aluno_id", id),
    supabase.from("anamneses").select("id, tipo, status, criada_em").eq("aluno_id", id).order("criada_em", { ascending: false }),
    supabase.from("acompanhamentos").select("id", { count: "exact", head: true }).eq("aluno_id", id),
    supabase.from("registros_evolucao").select("data, peso").eq("aluno_id", id).order("data", { ascending: false }).limit(5),
    supabase.from("documentos").select("id, tipo, titulo, versao, data").eq("aluno_id", id).order("data", { ascending: false }),
    supabase.from("pontuacoes").select("pontos").eq("aluno_id", id),
    supabase.from("conquistas").select("broche", { count: "exact", head: true }).eq("aluno_id", id),
    supabase.from("registro_alteracoes").select("id, tabela, acao, em").or(`registro_id.eq.${id},depois->>aluno_id.eq.${id},antes->>aluno_id.eq.${id}`).order("em", { ascending: false }).limit(12),
  ]);

  // Primeiro acesso: só dá para saber pelo serviço de login (servidor, professor já verificado)
  let ultimoAcesso: string | null = null;
  if (aluno.user_id) {
    const { data } = await clienteAdmin().auth.admin.getUserById(aluno.user_id);
    ultimoAcesso = data.user?.last_sign_in_at ?? null;
  }

  const listaCiclos = (ciclos.data ?? []) as Ciclo[];
  const cicloAtivo = listaCiclos.find((c) => c.ativo) ?? null;
  const s = situacaoDoCiclo(cicloAtivo);
  const alertas = alertasDoAluno(aluno, cicloAtivo);
  const totalPontos = (pontos.data ?? []).reduce((t, p) => t + p.pontos, 0);
  const listaAnamneses = anamneses.data ?? [];

  const conferencia = [
    { ok: !!aluno.app_treino, texto: "Plataforma de treino definida" },
    { ok: !!aluno.inicio && !!aluno.fim, texto: "Datas do contrato" },
    { ok: (contratos.data ?? []).some((c) => c.assinado), texto: "Contrato assinado anexado" },
    { ok: listaAnamneses.some((a) => a.status !== "rascunho"), texto: "Anamnese concluída" },
    { ok: listaAnamneses.some((a) => a.status === "revisada"), texto: "Anamnese revisada" },
    { ok: !!ultimoAcesso, texto: "Primeiro acesso do aluno" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/professor/alunos" className="inline-flex items-center gap-1 text-sm text-texto-suave hover:text-marca">
        <ArrowLeft className="size-4" /> Alunos
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{aluno.nome}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Selo tom={aluno.plano === "premium" ? "marca" : "neutro"}>{NOME_PLANO[aluno.plano]}</Selo>
            <Selo tom={aluno.situacao === "ativo" ? "ok" : aluno.situacao === "pausado" ? "alerta" : "neutro"}>{NOME_SITUACAO[aluno.situacao]}</Selo>
            {aluno.app_treino && <Selo>{NOME_APP[aluno.app_treino]}</Selo>}
            {alertas.map((a) => <Selo key={a.texto} tom={a.tom}>{a.texto}</Selo>)}
          </div>
          <p className="mt-2 text-sm text-texto-suave">
            {aluno.email} · {moedaBR(aluno.valor_contratado)} · contrato {dataBR(aluno.inicio)} a {dataBR(aluno.fim)}
          </p>
        </div>
        <Link href={`/professor/alunos/${id}/visao`} className="botao-secundario"><Eye className="size-4" /> Ver como o aluno</Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Ciclo */}
          <Cartao>
            <TituloCartao
              icone={CalendarDays}
              acao={cicloAtivo && (
                <form action={pausarOuRetomarCiclo.bind(null, id, cicloAtivo.id)}>
                  <button className="botao-secundario !py-1.5 text-sm">
                    {cicloAtivo.pausado_desde ? <><Play className="size-4" /> Retomar</> : <><Pause className="size-4" /> Pausar</>}
                  </button>
                </form>
              )}
            >
              Ciclo atual
            </TituloCartao>
            {cicloAtivo ? (
              <>
                <div className="mb-4 rounded-xl bg-fundo p-4">
                  <div className="flex items-end justify-between">
                    <p className="text-xl font-bold">
                      {s.tipo === "em_andamento" ? `Semana ${s.semana} de ${s.total}` : s.tipo === "encerrado" ? "Encerrado" : "Ainda não começou"}
                    </p>
                    <p className="text-sm text-texto-suave">Ciclo {cicloAtivo.numero} · {dataBR(cicloAtivo.inicio)} a {dataBR(cicloAtivo.fim)}</p>
                  </div>
                  {s.tipo === "em_andamento" && <Barra valor={s.progresso} className="mt-3" />}
                  {cicloAtivo.pausado_desde && <p className="mt-2 text-sm text-alerta">Pausado desde {dataBR(cicloAtivo.pausado_desde)}</p>}
                  {cicloAtivo.dias_pausados > 0 && <p className="mt-1 text-xs text-texto-suave">{cicloAtivo.dias_pausados} dias de pausa já descontados</p>}
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    {cicloAtivo.link_ciclo && <a className="inline-flex items-center gap-1 text-marca" href={cicloAtivo.link_ciclo} target="_blank" rel="noopener noreferrer">PDF do ciclo <ExternalLink className="size-3" /></a>}
                    {cicloAtivo.link_prontuario && <a className="inline-flex items-center gap-1 text-marca" href={cicloAtivo.link_prontuario} target="_blank" rel="noopener noreferrer">Prontuário <ExternalLink className="size-3" /></a>}
                  </div>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-marca">Editar este ciclo</summary>
                  <div className="mt-4"><FormCiclo acao={editarCiclo.bind(null, id, cicloAtivo.id)} ciclo={cicloAtivo} /></div>
                </details>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-marca">Começar o próximo ciclo</summary>
                  <div className="mt-4"><FormCiclo acao={novoCiclo.bind(null, id)} /></div>
                </details>
              </>
            ) : (
              <>
                <p className="mb-4 text-sm text-texto-suave">Nenhum ciclo ativo. Cria o primeiro para o aluno ver a semana no Início.</p>
                <FormCiclo acao={novoCiclo.bind(null, id)} />
              </>
            )}
            {listaCiclos.length > 1 && (
              <p className="mt-4 text-xs text-texto-suave">Ciclos anteriores: {listaCiclos.filter((c) => !c.ativo).map((c) => `#${c.numero} (${dataBR(c.inicio)})`).join(", ")}</p>
            )}
          </Cartao>

          {/* Cadastro */}
          <Cartao>
            <TituloCartao icone={UserCog}>Cadastro</TituloCartao>
            <FormCadastro acao={salvarCadastro.bind(null, id)} aluno={aluno} />
            <p className="mt-4 text-xs text-texto-suave">
              {aluno.notion_page_id ? "Ligado ao Notion." : "Ainda não ligado ao Notion."} {aluno.origem_id && "Importado do sistema antigo."}
            </p>
          </Cartao>

          {/* Etapas seguintes */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Cartao>
              <TituloCartao icone={ScrollText}>Anamneses</TituloCartao>
              {listaAnamneses.length ? (
                <ul className="space-y-2 text-sm">
                  {listaAnamneses.map((a) => (
                    <li key={a.id} className="flex justify-between"><span className="capitalize">{a.tipo}</span><Selo tom={a.status === "revisada" ? "ok" : "alerta"}>{a.status}</Selo></li>
                  ))}
                </ul>
              ) : (
                <Vazio icone={ScrollText} titulo="Nenhuma anamnese">O aluno preenche pelo app a partir da Etapa 4.</Vazio>
              )}
            </Cartao>
            <Cartao>
              <TituloCartao icone={ClipboardList}>Acompanhamentos</TituloCartao>
              {acompanhamentos.count ? (
                <p className="text-sm">{acompanhamentos.count} enviados</p>
              ) : (
                <Vazio icone={ClipboardList} titulo="Nenhum check-in ainda">Envio e resposta chegam na Etapa 2.</Vazio>
              )}
            </Cartao>
            <Cartao>
              <TituloCartao icone={LineChart}>Evolução</TituloCartao>
              {evolucao.data?.length ? (
                <ul className="space-y-1 text-sm">
                  {evolucao.data.map((r) => <li key={r.data} className="flex justify-between"><span>{dataBR(r.data)}</span><span className="font-semibold">{r.peso ? `${r.peso} kg` : "—"}</span></li>)}
                </ul>
              ) : (
                <Vazio icone={LineChart} titulo="Sem registros">Peso, medidas e fotos chegam na Etapa 2.</Vazio>
              )}
            </Cartao>
            <Cartao>
              <TituloCartao icone={Salad}>Plano alimentar e documentos</TituloCartao>
              {documentos.data?.length ? (
                <ul className="space-y-1 text-sm">
                  {documentos.data.map((d) => <li key={d.id} className="flex justify-between"><span>{d.titulo ?? d.tipo} v{d.versao}</span><span>{dataBR(d.data)}</span></li>)}
                </ul>
              ) : (
                <Vazio icone={FileText} titulo="Nenhum PDF">Upload do plano alimentar chega na Etapa 2.</Vazio>
              )}
            </Cartao>
          </div>
        </div>

        <div className="space-y-6">
          <Cartao>
            <TituloCartao icone={ShieldCheck}>Conferência do cadastro</TituloCartao>
            <ul className="space-y-2.5 text-sm">
              {conferencia.map((c) => (
                <li key={c.texto} className="flex items-center gap-2">
                  {c.ok ? <CheckCircle2 className="size-5 text-ok" /> : <Circle className="size-5 text-borda" />}
                  <span className={c.ok ? "" : "text-texto-suave"}>{c.texto}</span>
                </li>
              ))}
            </ul>
            <Barra valor={conferencia.filter((c) => c.ok).length / conferencia.length} className="mt-4" cor="bg-ok" />
            <p className="mt-2 text-xs text-texto-suave">{ultimoAcesso ? `Último acesso: ${dataBR(ultimoAcesso)}` : "O aluno ainda não entrou."}</p>
          </Cartao>

          <Cartao>
            <TituloCartao icone={Trophy}>Pontos e conquistas</TituloCartao>
            <p className="text-sm"><strong className="text-xl">{totalPontos}</strong> pts · {conquistas.count ?? 0} broches</p>
          </Cartao>

          <Cartao>
            <TituloCartao icone={NotebookPen}>Anotações internas</TituloCartao>
            <FormAnotacao acao={adicionarAnotacao.bind(null, id)} />
            <ul className="mt-4 space-y-3">
              {(anotacoes.data ?? []).map((n) => (
                <li key={n.id} className="border-l-2 border-marca pl-3 text-sm">
                  <p className="whitespace-pre-line">{n.texto}</p>
                  <p className="mt-0.5 text-xs text-texto-suave">{dataBR(n.criada_em)}</p>
                </li>
              ))}
            </ul>
          </Cartao>

          <Cartao>
            <TituloCartao icone={History}>Linha do tempo</TituloCartao>
            {historico.data?.length ? (
              <ul className="space-y-2 text-sm">
                {historico.data.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2">
                    <span>{NOME_TABELA[h.tabela] ?? h.tabela} {NOME_ACAO[h.acao] ?? h.acao}</span>
                    <span className="shrink-0 text-texto-suave">{dataBR(h.em)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-texto-suave">Nada registrado ainda.</p>
            )}
          </Cartao>
        </div>
      </div>
    </div>
  );
}
