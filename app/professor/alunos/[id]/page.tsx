import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, CalendarDays, CheckCircle2, Dumbbell, Circle, ClipboardList, Download, Eye, FileText, History, LineChart, NotebookPen, Pause, Play, Salad,
  ScrollText, ShieldCheck, Trophy, UserCog, ExternalLink, Lock, MessageCircle, MessageSquareText,
} from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/servidor";
import { situacaoDoCiclo } from "@/lib/ciclo";
import { alertasDoAluno } from "@/lib/atencao";
import { dataBR, linkWhatsapp, moedaBR } from "@/lib/formato";
import { NOME_APP, NOME_PLANO, NOME_SITUACAO, type Aluno, type Ciclo } from "@/lib/tipos";
import { Avatar, Barra, Cartao, Selo, TituloCartao, Vazio } from "@/components/ui";
import { linksFotoPerfil } from "@/lib/foto-perfil";
import { BotaoSituacao, FormAnotacao, FormCadastro, FormCiclo, FormEndereco, FormExcluirAluno, FormOrientacao, UploadPlano, type DadosPrivados } from "@/components/professor/formularios";
import { PainelEvolucao } from "@/components/evolucao";
import { sinaisDeAlerta, type Respostas } from "@/lib/acompanhamento";
import {
  adicionarAnotacao, darConquista, editarCiclo, excluirDadosDoAluno, mudarSituacao, novoCiclo, pedirRealinhamento, pausarOuRetomarCiclo, publicarOrientacao, registrarDocumento, salvarCadastro, salvarDadosPrivados,
} from "../../acoes";

export const metadata = { title: "Ficha do aluno · Painel do Professor" };

const NOME_TABELA: Record<string, string> = {
  alunos: "Cadastro",
  ciclos: "Ciclo",
  anotacoes_internas: "Anotação",
  contratos: "Contrato",
  anamneses: "Anamnese",
  acompanhamentos: "Acompanhamento",
  registros_evolucao: "Evolução",
  reavaliacoes: "Reavaliação",
  documentos: "Documento",
  orientacoes: "Orientação",
  dados_privados: "Endereço",
};
const NOME_ACAO: Record<string, string> = { insert: "novo", update: "alteração", delete: "remoção" };

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirProfessor();

  const { data: aluno } = await supabase.from("alunos").select("*").eq("id", id).maybeSingle<Aluno>();
  if (!aluno) notFound();
  const fotoUrl = aluno.foto_perfil ? (await linksFotoPerfil([aluno.foto_perfil]))[aluno.foto_perfil] ?? null : null;
  const zapAluno = linkWhatsapp(aluno.telefone, `Oi, ${aluno.nome.split(" ")[0]}!`);

  const [ciclos, anotacoes, contratos, anamneses, acompanhamentos, reavaliacoes, documentos, pontos, conquistas, historico, privados] = await Promise.all([
    supabase.from("ciclos").select("*").eq("aluno_id", id).order("numero", { ascending: false }),
    supabase.from("anotacoes_internas").select("id, texto, criada_em").eq("aluno_id", id).order("criada_em", { ascending: false }).limit(20),
    supabase.from("contratos").select("id, data, assinado").eq("aluno_id", id),
    supabase.from("anamneses").select("id, tipo, status, criada_em, concluida_em").eq("aluno_id", id).order("criada_em", { ascending: false }),
    supabase.from("acompanhamentos").select("id, semana, enviado_em, respostas, resposta_professor, atencao").eq("aluno_id", id).order("enviado_em", { ascending: false }).limit(12),
    supabase.from("reavaliacoes").select("ciclo_id, formato, escolhido_em").eq("aluno_id", id),
    supabase.from("documentos").select("id, tipo, titulo, versao, data, arquivo_path").eq("aluno_id", id).order("data", { ascending: false }).order("versao", { ascending: false }),
    supabase.from("pontuacoes").select("pontos").eq("aluno_id", id),
    supabase.from("conquistas").select("broche", { count: "exact", head: true }).eq("aluno_id", id),
    supabase.from("registro_alteracoes").select("id, tabela, acao, em").or(`registro_id.eq.${id},depois->>aluno_id.eq.${id},antes->>aluno_id.eq.${id}`).order("em", { ascending: false }).limit(12),
    supabase.from("dados_privados").select("*").eq("aluno_id", id).maybeSingle<DadosPrivados>(),
  ]);

  const [{ data: programaAtivo }, { data: ultimaExecucao }] = await Promise.all([
    supabase.from("programas").select("nome, treinos(id)").eq("aluno_id", id).eq("ativo", true).maybeSingle(),
    supabase.from("execucoes").select("nome_treino, iniciada_em").eq("aluno_id", id).order("iniciada_em", { ascending: false }).limit(1).maybeSingle(),
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
  const reavAtual = cicloAtivo ? (reavaliacoes.data ?? []).find((r) => r.ciclo_id === cicloAtivo.id) : undefined;
  const listaDocs = documentos.data ?? [];
  const { data: linksDocs } = listaDocs.length
    ? await supabase.storage.from("documentos").createSignedUrls(listaDocs.map((d) => d.arquivo_path), 3600)
    : { data: [] };
  const linkDoc = (p: string) => linksDocs?.find((l) => l.path === p)?.signedUrl ?? undefined;

  const conferencia = [
    { ok: !!aluno.app_treino, texto: "Plataforma de treino definida" },
    { ok: !!aluno.inicio && !!aluno.fim, texto: "Datas do contrato" },
    { ok: (contratos.data ?? []).some((c) => c.assinado), texto: "Contrato assinado anexado" },
    { ok: listaAnamneses.some((a) => a.status !== "rascunho"), texto: "Anamnese concluída" },
    { ok: listaAnamneses.some((a) => a.status === "revisada"), texto: "Anamnese revisada" },
    { ok: !!ultimoAcesso, texto: "Primeiro acesso do aluno" },
    { ok: !!aluno.termos_aceitos_em, texto: "Termos de privacidade aceitos" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/professor/alunos" className="inline-flex items-center gap-1 text-sm text-texto-suave hover:text-marca">
        <ArrowLeft className="size-4" /> Alunos
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Avatar nome={aluno.nome} url={fotoUrl} className="size-12 text-base" />
            <h1 className="text-2xl font-bold">{aluno.nome}</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Selo tom={aluno.plano === "premium" ? "marca" : "neutro"}>{NOME_PLANO[aluno.plano]}</Selo>
            <Selo tom={aluno.situacao === "ativo" ? "ok" : aluno.situacao === "pausado" ? "alerta" : "neutro"}>{NOME_SITUACAO[aluno.situacao]}</Selo>
            {aluno.app_treino && <Selo>{NOME_APP[aluno.app_treino]}</Selo>}
            {alertas.map((a) => <Selo key={a.texto} tom={a.tom}>{a.texto}</Selo>)}
          </div>
          <p className="mt-2 break-words text-sm text-texto-suave">
            {aluno.email} · {moedaBR(aluno.valor_contratado)} · contrato {dataBR(aluno.inicio)} a {dataBR(aluno.fim)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {zapAluno && <a href={zapAluno} target="_blank" rel="noopener noreferrer" className="botao-secundario"><MessageCircle className="size-4" /> WhatsApp</a>}
          <Link href={`/professor/alunos/${id}/visao`} className="botao-secundario"><Eye className="size-4" /> Ver como o aluno</Link>
          <BotaoSituacao
            acao={mudarSituacao.bind(null, id, aluno.situacao === "inativo" ? "ativo" : "inativo")}
            inativo={aluno.situacao === "inativo"}
            nome={aluno.nome.split(" ")[0]}
          />
        </div>
      </header>

      {aluno.situacao === "inativo" && (
        <p className="flex items-center gap-2 rounded-xl bg-perigo-suave px-4 py-3 text-sm text-perigo">
          <Lock className="size-4" /> Aluno inativo: o acesso ao app está bloqueado. Cadastro e histórico continuam guardados aqui.
        </p>
      )}

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
                  <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
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
                  {reavAtual && (
                    <p className="mt-3 text-sm">
                      <Selo tom="marca">Reavaliação: {reavAtual.formato === "call" ? "quer call" : "pelo WhatsApp"}</Selo>
                      <span className="ml-2 text-xs text-texto-suave">escolheu em {dataBR(reavAtual.escolhido_em)}</span>
                    </p>
                  )}
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

          {/* Treino no app */}
          <Cartao>
            <TituloCartao icone={Dumbbell} acao={<Link href={`/professor/alunos/${id}/treino`} className="botao-secundario !py-1.5 text-sm">{programaAtivo ? "Abrir treino" : "Montar treino"}</Link>}>
              Treino no app
            </TituloCartao>
            {programaAtivo ? (
              <p className="text-sm">
                <strong>{programaAtivo.nome}</strong> · {programaAtivo.treinos.length} treino{programaAtivo.treinos.length === 1 ? "" : "s"}
                <span className="text-texto-suave">
                  {" "}· {ultimaExecucao ? `último treino em ${dataBR(ultimaExecucao.iniciada_em.slice(0, 10))} (${ultimaExecucao.nome_treino})` : "ainda não treinou pelo app"}
                </span>
              </p>
            ) : (
              <p className="text-sm text-texto-suave">Sem programa no app. Monte aqui para o aluno treinar pela aba Treino (com aviso de pausa e registro das cargas).</p>
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

          {/* Endereço e nota fiscal: tabela que o aluno não consegue ler */}
          <Cartao>
            <TituloCartao icone={Lock} acao={<span className="text-xs text-texto-suave">Só você vê</span>}>Endereço e nota fiscal</TituloCartao>
            <FormEndereco acao={salvarDadosPrivados.bind(null, id)} dados={privados.data ?? null} />
          </Cartao>

          {/* Etapas seguintes */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Cartao>
              <TituloCartao icone={ScrollText}>Anamneses</TituloCartao>
              {listaAnamneses.length ? (
                <ul className="-mx-2 space-y-1 text-sm">
                  {listaAnamneses.map((a) => (
                    <li key={a.id}>
                      <Link href={`/professor/anamneses/${a.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-fundo">
                        <span>
                          <span className="font-semibold">{a.tipo === "inicial" ? "Inicial" : "Realinhamento"}</span>
                          <span className="ml-2 text-texto-suave">{dataBR(a.concluida_em ?? a.criada_em)}</span>
                        </span>
                        <Selo tom={a.status === "revisada" ? "ok" : a.status === "concluida" ? "marca" : "alerta"}>
                          {a.status === "revisada" ? "Revisada" : a.status === "concluida" ? "Revisar" : "Preenchendo"}
                        </Selo>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vazio icone={ScrollText} titulo="Nenhuma anamnese">O aluno preenche pelo app no primeiro acesso.</Vazio>
              )}
              {listaAnamneses.some((a) => a.status !== "rascunho") && !listaAnamneses.some((a) => a.status === "rascunho") && (
                <form action={pedirRealinhamento.bind(null, id)} className="mt-3">
                  <button className="botao-secundario !py-1.5 text-sm">Pedir anamnese de realinhamento</button>
                </form>
              )}
            </Cartao>
            <Cartao>
              <TituloCartao icone={MessageSquareText}>Recado só para este aluno</TituloCartao>
              <FormOrientacao acao={publicarOrientacao.bind(null, id)} />
            </Cartao>
          </div>

          <Cartao>
            <TituloCartao icone={ClipboardList}>Acompanhamentos</TituloCartao>
            {acompanhamentos.data?.length ? (
              <ul className="-mx-2 divide-y divide-borda">
                {acompanhamentos.data.map((a) => {
                  const sinais = sinaisDeAlerta(a.respostas as Partial<Respostas>);
                  return (
                    <li key={a.id}>
                      <Link href={`/professor/acompanhamentos/${a.id}`} className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-2.5 text-sm hover:bg-fundo">
                        <span className="font-semibold">{a.semana ? `Semana ${a.semana}` : "Acompanhamento"}</span>
                        <span className="text-texto-suave">{dataBR(a.enviado_em)}</span>
                        <span className="ml-auto flex flex-wrap gap-1">
                          {a.atencao && <Selo tom="perigo">Atenção</Selo>}
                          {sinais.map((s) => <Selo key={s} tom="alerta">{s}</Selo>)}
                          {a.resposta_professor ? <Selo tom="ok">Respondido</Selo> : <Selo tom="marca">Responder</Selo>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Vazio icone={ClipboardList} titulo="Nenhum acompanhamento ainda">Quando o aluno enviar pelo app, aparece aqui e na tela Hoje.</Vazio>
            )}
          </Cartao>

          <Cartao>
            <TituloCartao icone={Salad} acao={!aluno.tem_nutricao && <span className="text-xs text-texto-suave">Área de Nutrição desligada para este aluno</span>}>
              Plano alimentar
            </TituloCartao>
            {listaDocs.filter((d) => d.tipo === "plano_alimentar").length > 0 && (
              <ul className="mb-4 space-y-1 text-sm">
                {listaDocs.filter((d) => d.tipo === "plano_alimentar").map((d) => (
                  <li key={d.id} className="flex justify-between">
                    <a href={linkDoc(d.arquivo_path)} target="_blank" rel="noopener noreferrer" className="text-marca">{d.titulo ?? "Plano alimentar"} · v{d.versao}</a>
                    <span className="text-texto-suave">{dataBR(d.data)}</span>
                  </li>
                ))}
              </ul>
            )}
            <UploadPlano alunoId={id} registrar={registrarDocumento.bind(null, id)} />
            <p className="mt-2 text-xs text-texto-suave">Publicar um PDF liga a área de Nutrição para o aluno.</p>
          </Cartao>

          <div>
            <h2 className="rotulo mb-3 flex items-center gap-2"><LineChart className="size-4" /> Evolução</h2>
            <PainelEvolucao supabase={supabase} alunoId={id} />
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
            <p className="mt-3 text-xs text-texto-suave">Broches que dependem de você:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <form action={darConquista.bind(null, id, "meta_ciclo")}><button className="botao-secundario !py-1.5 text-sm">Meta do ciclo batida</button></form>
              <form action={darConquista.bind(null, id, "renovacao")}><button className="botao-secundario !py-1.5 text-sm">Renovou</button></form>
            </div>
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
            <TituloCartao icone={Download}>Dados do aluno (LGPD)</TituloCartao>
            <p className="text-sm text-texto-suave">
              {aluno.termos_aceitos_em ? `Termos aceitos em ${dataBR(aluno.termos_aceitos_em)}.` : "Ainda não aceitou os termos."} Se o aluno pedir, você manda a cópia ou apaga tudo.
            </p>
            <a href={`/professor/alunos/${id}/exportar`} className="botao-secundario mt-3 !py-1.5 text-sm"><Download className="size-4" /> Baixar cópia dos dados</a>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-perigo">Apagar todos os dados</summary>
              <p className="my-2 text-xs text-texto-suave">Só a pedido do aluno. Para só tirar o acesso, use Inativar: o histórico fica guardado.</p>
              <FormExcluirAluno acao={excluirDadosDoAluno.bind(null, id)} nome={aluno.nome} />
            </details>
          </Cartao>

          <Cartao>
            <TituloCartao icone={History}>Linha do tempo</TituloCartao>
            {historico.data?.length ? (
              <ul className="space-y-2 text-sm">
                {historico.data.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2">
                    <span>{NOME_TABELA[h.tabela] ?? h.tabela} · {NOME_ACAO[h.acao] ?? h.acao}</span>
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
