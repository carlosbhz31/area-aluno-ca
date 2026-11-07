"use client";

import { useActionState, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { Resultado } from "@/app/professor/acoes";
import type { Aluno, Ciclo } from "@/lib/tipos";
import { DIAS } from "@/lib/tipos";

type Acao = (estado: Resultado, f: FormData) => Promise<Resultado>;

function Campo({ rotulo, children, largo = false }: { rotulo: string; children: React.ReactNode; largo?: boolean }) {
  return (
    <label className={largo ? "sm:col-span-2" : ""}>
      <span className="rotulo">{rotulo}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Rodape({ pendente, estado, rotulo = "Salvar" }: { pendente: boolean; estado: Resultado; rotulo?: string }) {
  return (
    <div className="flex items-center gap-3 sm:col-span-2">
      <button className="botao" disabled={pendente}>
        {pendente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {rotulo}
      </button>
      {estado?.erro && <p className="text-sm text-perigo">{estado.erro}</p>}
      {estado?.ok && <p className="text-sm text-ok">{estado.ok}</p>}
    </div>
  );
}

export function FormCadastro({ acao, aluno, novo = false }: { acao: Acao; aluno?: Aluno; novo?: boolean }) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  const a = aluno;
  return (
    <form action={enviar} className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Nome completo"><input name="nome" required defaultValue={a?.nome} className="campo" /></Campo>
      <Campo rotulo="E-mail (login)"><input name="email" type="email" required defaultValue={a?.email} className="campo" /></Campo>
      <Campo rotulo="Telefone / WhatsApp"><input name="telefone" defaultValue={a?.telefone ?? ""} className="campo" /></Campo>
      <Campo rotulo="Nascimento"><input name="nascimento" type="date" defaultValue={a?.nascimento ?? ""} className="campo" /></Campo>
      <Campo rotulo="Situação">
        <select name="situacao" defaultValue={a?.situacao ?? "ativo"} className="campo">
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
          <option value="inativo">Inativo</option>
        </select>
      </Campo>
      <Campo rotulo="Plano">
        <select name="plano" defaultValue={a?.plano ?? "premium"} className="campo">
          <option value="premium">Premium</option>
          <option value="light">Light</option>
        </select>
      </Campo>
      <Campo rotulo="Tipo de aluno">
        <select name="modalidade" defaultValue={a?.modalidade ?? "consultoria"} className="campo">
          <option value="consultoria">Consultoria (online)</option>
          <option value="presencial">Presencial (personal)</option>
          <option value="ambos">Presencial + consultoria nos outros dias</option>
        </select>
      </Campo>
      <Campo rotulo="Valor contratado (R$)"><input name="valor_contratado" inputMode="decimal" defaultValue={a?.valor_contratado ?? ""} className="campo" /></Campo>
      <Campo rotulo="Forma de pagamento"><input name="forma_pagamento" defaultValue={a?.forma_pagamento ?? ""} placeholder="Pix, cartão 6x…" className="campo" /></Campo>
      <Campo rotulo="Tempo contratado"><input name="tempo_contratado" defaultValue={a?.tempo_contratado ?? ""} placeholder="Semestral, anual…" className="campo" /></Campo>
      <Campo rotulo="Dia do acompanhamento">
        <select name="dia_acompanhamento" defaultValue={a?.dia_acompanhamento ?? ""} className="campo">
          <option value="">—</option>
          {DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
      </Campo>
      <Campo rotulo="Início do contrato"><input name="inicio" type="date" defaultValue={a?.inicio ?? ""} className="campo" /></Campo>
      <Campo rotulo="Fim do contrato"><input name="fim" type="date" defaultValue={a?.fim ?? ""} className="campo" /></Campo>
      <Campo rotulo="App de treino">
        <select name="app_treino" defaultValue={a?.app_treino ?? ""} className="campo">
          <option value="">Não definido</option>
          <option value="mfit">MFit</option>
          <option value="treinoio">treino.io</option>
        </select>
      </Campo>
      <Campo rotulo="Link individual do app (opcional)"><input name="app_treino_link" type="url" defaultValue={a?.app_treino_link ?? ""} className="campo" /></Campo>
      <Campo rotulo="Nutricionista"><input name="nutricionista" defaultValue={a?.nutricionista ?? ""} className="campo" /></Campo>
      <label className="flex items-center gap-2 self-end pb-3 text-sm">
        <input type="checkbox" name="tem_nutricao" defaultChecked={a?.tem_nutricao ?? false} className="size-4 accent-[var(--marca)]" />
        Tem plano alimentar (mostra a área de Nutrição)
      </label>
      {novo && <Campo rotulo="Início do 1º ciclo (opcional)"><input name="inicio_ciclo" type="date" className="campo" /></Campo>}
      <Campo rotulo="Objetivo principal" largo><textarea name="objetivo" rows={2} defaultValue={a?.objetivo ?? ""} className="campo" /></Campo>
      <Rodape pendente={pendente} estado={estado} rotulo={novo ? "Cadastrar aluno" : "Salvar cadastro"} />
    </form>
  );
}

export function FormCiclo({ acao, ciclo }: { acao: Acao; ciclo?: Ciclo | null }) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  return (
    <form action={enviar} className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Início"><input name="inicio" type="date" required defaultValue={ciclo?.inicio ?? ""} className="campo" /></Campo>
      <Campo rotulo="Semanas"><input name="semanas" type="number" min={1} max={52} defaultValue={ciclo?.semanas ?? 8} className="campo" /></Campo>
      <Campo rotulo="Objetivo do ciclo" largo><input name="objetivo" defaultValue={ciclo?.objetivo ?? ""} className="campo" /></Campo>
      <Campo rotulo="Link do PDF do ciclo (Drive)"><input name="link_ciclo" type="url" defaultValue={ciclo?.link_ciclo ?? ""} className="campo" /></Campo>
      <Campo rotulo="Link do prontuário (Drive)"><input name="link_prontuario" type="url" defaultValue={ciclo?.link_prontuario ?? ""} className="campo" /></Campo>
      <Rodape pendente={pendente} estado={estado} rotulo={ciclo ? "Salvar ciclo" : "Criar ciclo"} />
    </form>
  );
}

export function FormResposta({ acao, resposta, atencao }: { acao: Acao; resposta: string | null; atencao: boolean }) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  return (
    <form action={enviar} className="space-y-3">
      <textarea name="resposta" rows={7} defaultValue={resposta ?? ""} placeholder="Sua resposta. Curta e direta, como no WhatsApp." className="campo" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="atencao" defaultChecked={atencao} className="size-4 accent-[var(--marca)]" />
        Marcar como ponto de atenção
      </label>
      <Rodape pendente={pendente} estado={estado} rotulo={resposta ? "Atualizar resposta" : "Enviar resposta"} />
    </form>
  );
}

export function FormOrientacao({ acao, paraTodos = false }: { acao: Acao; paraTodos?: boolean }) {
  const [estado, setEstado] = useState<Resultado>(undefined);
  const [pendente, setPendente] = useState(false);
  const [rodada, setRodada] = useState(0);
  return (
    <form
      key={rodada}
      action={async (f) => {
        setPendente(true);
        const r = await acao(undefined, f);
        setEstado(r);
        setPendente(false);
        if (r?.ok) setRodada((n) => n + 1);
      }}
      className="space-y-2"
    >
      <textarea name="texto" rows={3} placeholder={paraTodos ? "Recado para todos os alunos. Ex.: semana de feriado, treino pode ser mais curto." : "Recado só para este aluno."} className="campo" />
      <div className="flex items-center gap-3">
        <button className="botao-secundario" disabled={pendente}>{pendente ? <Loader2 className="size-4 animate-spin" /> : "Publicar no Início"}</button>
        {estado?.erro && <p className="text-sm text-perigo">{estado.erro}</p>}
        {estado?.ok && <p className="text-sm text-ok">{estado.ok}</p>}
      </div>
      <p className="text-xs text-texto-suave">Fica em destaque no Início por 7 dias e depois vai para "Meu plano".</p>
    </form>
  );
}

export function UploadPlano({ alunoId, registrar }: { alunoId: string; registrar: (caminho: string, titulo: string | null) => Promise<Resultado> }) {
  const [estado, setEstado] = useState<Resultado>(undefined);
  const [pendente, setPendente] = useState(false);
  const [rodada, setRodada] = useState(0);

  async function enviar(f: FormData) {
    const arquivo = f.get("arquivo");
    if (!(arquivo instanceof File) || arquivo.size === 0) return setEstado({ erro: "Escolhe o PDF." });
    if (arquivo.type !== "application/pdf") return setEstado({ erro: "Tem que ser PDF." });
    setPendente(true);
    const { clienteNavegador } = await import("@/lib/supabase/navegador");
    const caminho = `${alunoId}/plano-alimentar-${Date.now()}.pdf`;
    const { error } = await clienteNavegador().storage.from("documentos").upload(caminho, arquivo, { contentType: "application/pdf" });
    const r = error ? { erro: "Não consegui enviar o PDF." } : await registrar(caminho, String(f.get("titulo") ?? "").trim() || null);
    setEstado(r);
    setPendente(false);
    if (r?.ok) setRodada((n) => n + 1);
  }

  return (
    <form key={rodada} action={enviar} className="space-y-3">
      <input name="titulo" placeholder="Título (opcional). Ex.: Plano alimentar — novembro" className="campo" />
      <input name="arquivo" type="file" accept="application/pdf" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-marca-suave file:px-3 file:py-2 file:font-semibold file:text-marca" />
      <div className="flex items-center gap-3">
        <button className="botao-secundario" disabled={pendente}>{pendente ? <Loader2 className="size-4 animate-spin" /> : "Publicar PDF"}</button>
        {estado?.erro && <p className="text-sm text-perigo">{estado.erro}</p>}
        {estado?.ok && <p className="text-sm text-ok">{estado.ok}</p>}
      </div>
    </form>
  );
}

export function FormConfiguracoes({ acao, valores }: { acao: Acao; valores: { whatsapp: string | null; agenda: string | null; dia: number } }) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  return (
    <form action={enviar} className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Seu WhatsApp (com DDD)">
        <input name="whatsapp_carlos" inputMode="tel" defaultValue={valores.whatsapp ?? ""} placeholder="31 99999-9999" className="campo" />
      </Campo>
      <Campo rotulo="Dia padrão do acompanhamento">
        <select name="dia_padrao_acompanhamento" defaultValue={valores.dia} className="campo">
          {DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
      </Campo>
      <Campo rotulo="Link da sua agenda para calls (opcional)" largo>
        <input name="link_agenda" type="url" defaultValue={valores.agenda ?? ""} placeholder="https://calendly.com/... ou link de agendamento do Google" className="campo" />
      </Campo>
      <p className="text-xs text-texto-suave sm:col-span-2">
        Na semana 7, quem escolhe "call" abre esse link. Sem link, abre o seu WhatsApp com a mensagem pronta.
      </p>
      <Rodape pendente={pendente} estado={estado} />
    </form>
  );
}

export function FormJogo({
  acao, regras, nomes, faixas,
}: { acao: Acao; regras: Record<string, number>; nomes: Record<string, string>; faixas: { liga: string; min: number }[] }) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  return (
    <form action={enviar} className="space-y-5">
      <div>
        <p className="rotulo mb-2">Pontos por ação</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(nomes).map(([k, nome]) => (
            <label key={k} className="flex items-center justify-between gap-3 rounded-xl border border-borda px-3 py-2 text-sm">
              <span>{nome}</span>
              <input name={`regra_${k}`} type="number" min={-50} max={50} defaultValue={regras[k] ?? 0} className="campo !w-20 !py-1.5 text-center" />
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="rotulo mb-2">Pontos para entrar em cada liga (provisório)</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {faixas.map((f, i) => (
            <label key={f.liga} className="rounded-xl border border-borda px-3 py-2 text-sm">
              <span className="block font-semibold">{f.liga}</span>
              <input name={`liga_${f.liga}`} type="number" min={0} defaultValue={f.min} disabled={i === 0} className="campo mt-1 !py-1.5" />
            </label>
          ))}
        </div>
      </div>
      <Rodape pendente={pendente} estado={estado} rotulo="Salvar pontos e ligas" />
    </form>
  );
}

export function FormNutricionista({ acao }: { acao: Acao }) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  return (
    <form action={enviar} className="flex flex-wrap items-start gap-3">
      <input name="email" type="email" required placeholder="email.da.nutri@exemplo.com" className="campo !w-auto min-w-64 flex-1" />
      <button className="botao" disabled={pendente}>{pendente ? <Loader2 className="size-4 animate-spin" /> : "Liberar acesso"}</button>
      {estado?.erro && <p className="w-full text-sm text-perigo">{estado.erro}</p>}
      {estado?.ok && <p className="w-full text-sm text-ok">{estado.ok}</p>}
    </form>
  );
}

export function BotaoSituacao({ acao, inativo, nome }: { acao: () => Promise<void>; inativo: boolean; nome: string }) {
  const [pendente, setPendente] = useState(false);
  async function clicar() {
    const pergunta = inativo
      ? `Reativar ${nome}? O acesso volta e tudo que estava guardado aparece de novo.`
      : `Inativar ${nome}? O acesso ao app é bloqueado, mas o cadastro e o histórico ficam guardados.`;
    if (!window.confirm(pergunta)) return;
    setPendente(true);
    await acao();
    setPendente(false);
  }
  return (
    <button type="button" onClick={clicar} disabled={pendente} className={inativo ? "botao" : "botao-secundario !text-perigo"}>
      {pendente ? <Loader2 className="size-4 animate-spin" /> : inativo ? "Reativar aluno" : "Inativar aluno"}
    </button>
  );
}

export type DadosPrivados = {
  cpf: string | null; cep: string | null; logradouro: string | null; numero: string | null;
  complemento: string | null; bairro: string | null; cidade: string | null; uf: string | null;
};

export function FormEndereco({ acao, dados }: { acao: Acao; dados: DadosPrivados | null }) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  const [end, setEnd] = useState({
    logradouro: dados?.logradouro ?? "", bairro: dados?.bairro ?? "", cidade: dados?.cidade ?? "", uf: dados?.uf ?? "",
  });
  const [buscando, setBuscando] = useState(false);

  // Preenche rua, bairro, cidade e UF pelo CEP (ViaCEP; só o CEP sai daqui)
  async function buscarCep(cep: string) {
    const so = cep.replace(/\D/g, "");
    if (so.length !== 8) return;
    setBuscando(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${so}/json/`).then((x) => x.json());
      if (!r.erro) setEnd({ logradouro: r.logradouro ?? "", bairro: r.bairro ?? "", cidade: r.localidade ?? "", uf: r.uf ?? "" });
    } catch {
      // sem internet ou CEP fora do ar: preenche à mão
    }
    setBuscando(false);
  }

  return (
    <form action={enviar} className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="CPF"><input name="cpf" inputMode="numeric" defaultValue={dados?.cpf ?? ""} placeholder="000.000.000-00" className="campo" /></Campo>
      <Campo rotulo={buscando ? "CEP (buscando…)" : "CEP"}>
        <input name="cep" inputMode="numeric" defaultValue={dados?.cep ?? ""} placeholder="00000-000" className="campo" onBlur={(e) => buscarCep(e.target.value)} />
      </Campo>
      <Campo rotulo="Rua" largo><input name="logradouro" value={end.logradouro} onChange={(e) => setEnd({ ...end, logradouro: e.target.value })} className="campo" /></Campo>
      <Campo rotulo="Número"><input name="numero" defaultValue={dados?.numero ?? ""} className="campo" /></Campo>
      <Campo rotulo="Complemento"><input name="complemento" defaultValue={dados?.complemento ?? ""} className="campo" /></Campo>
      <Campo rotulo="Bairro"><input name="bairro" value={end.bairro} onChange={(e) => setEnd({ ...end, bairro: e.target.value })} className="campo" /></Campo>
      <div className="grid grid-cols-[1fr_5rem] gap-4">
        <Campo rotulo="Cidade"><input name="cidade" value={end.cidade} onChange={(e) => setEnd({ ...end, cidade: e.target.value })} className="campo" /></Campo>
        <Campo rotulo="UF"><input name="uf" maxLength={2} value={end.uf} onChange={(e) => setEnd({ ...end, uf: e.target.value.toUpperCase() })} className="campo" /></Campo>
      </div>
      <Rodape pendente={pendente} estado={estado} rotulo="Salvar endereço" />
    </form>
  );
}

/** Botões de copiar e mandar pelo WhatsApp um link de cadastro. */
export function CompartilharLink({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);
  const mensagem = `Oi! Aqui está o link para você fazer seu cadastro na Área do Aluno da Consultoria: ${link}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-fundo px-3 py-2 text-xs">{link}</code>
      <button
        type="button"
        className="botao-secundario !py-1.5 text-sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          } catch {
            window.prompt("Copia o link:", link);
          }
        }}
      >
        {copiado ? "Copiado!" : "Copiar"}
      </button>
      <a href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener noreferrer" className="botao !py-1.5 text-sm">WhatsApp</a>
    </div>
  );
}

export function FormConvite({ acao, site }: { acao: Acao; site: string }) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  return (
    <form action={enviar} className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Para quem é (só você vê)"><input name="rotulo" placeholder="Ex.: Ana, indicação da Bia" className="campo" /></Campo>
      <Campo rotulo="Plano">
        <select name="plano" className="campo" defaultValue="premium"><option value="premium">Premium</option><option value="light">Light</option></select>
      </Campo>
      <Campo rotulo="Valor contratado (R$)"><input name="valor_contratado" inputMode="decimal" className="campo" /></Campo>
      <Campo rotulo="App de treino">
        <select name="app_treino" className="campo" defaultValue="mfit"><option value="mfit">MFit</option><option value="treinoio">treino.io</option><option value="">Ainda não sei</option></select>
      </Campo>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="tem_nutricao" className="size-4 accent-[var(--marca)]" /> Tem acompanhamento com nutricionista
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="botao" disabled={pendente}>{pendente ? <Loader2 className="size-4 animate-spin" /> : "Gerar link"}</button>
        {estado?.erro && <p className="text-sm text-perigo">{estado.erro}</p>}
      </div>
      {estado?.ok && (
        <div className="space-y-2 rounded-xl bg-ok-suave p-4 sm:col-span-2">
          <p className="text-sm font-semibold text-ok">Link pronto. Vale por 14 dias e serve para uma pessoa só.</p>
          <CompartilharLink link={`${site}/cadastro/${estado.ok}`} />
        </div>
      )}
    </form>
  );
}

/** Exclusão definitiva (LGPD). Pede o nome completo para não apagar por engano. */
export function FormExcluirAluno({ acao, nome }: { acao: Acao; nome: string }) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  return (
    <form
      action={enviar}
      onSubmit={(e) => {
        if (!window.confirm(`Apagar TUDO de ${nome}? Cadastro, anamneses, acompanhamentos, fotos, PDFs e login. Não tem volta.`)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input name="confirmacao" placeholder={`Digite: ${nome}`} autoComplete="off" className="campo" />
      <div className="flex items-center gap-3">
        <button className="botao-secundario !text-perigo" disabled={pendente}>{pendente ? <Loader2 className="size-4 animate-spin" /> : "Apagar todos os dados"}</button>
        {estado?.erro && <p className="text-sm text-perigo">{estado.erro}</p>}
      </div>
    </form>
  );
}

export function FormAnotacao({ acao }: { acao: Acao }) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  return (
    <form action={enviar} className="space-y-2" key={estado?.ok ? Date.now() : "anotacao"}>
      <textarea name="texto" rows={3} placeholder="Só você vê. Ex.: reclamou de dor no ombro na semana 3." className="campo" />
      <div className="flex items-center gap-3">
        <button className="botao-secundario" disabled={pendente}>{pendente ? <Loader2 className="size-4 animate-spin" /> : "Anotar"}</button>
        {estado?.erro && <p className="text-sm text-perigo">{estado.erro}</p>}
      </div>
    </form>
  );
}
