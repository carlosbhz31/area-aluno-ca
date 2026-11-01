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
