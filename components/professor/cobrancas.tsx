"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Calculator, Check, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { criarCobranca, excluirCobranca, excluirVarias, marcarPago, marcarVariasPagas } from "@/app/professor/cobrancas/acoes";
import { textoCalculo, totalAulas, type CalculoAulas } from "@/lib/cobranca";
import { dataBR, moedaBR } from "@/lib/formato";

export type LinhaCobranca = {
  id: string;
  aluno_id: string;
  aluno: string;
  zap: string | null;
  descricao: string;
  valor: number;
  vencimento: string;
  pago_em: string | null;
  forma: string | null;
  calculo: CalculoAulas | null;
  observacao: string | null;
};

const n = (v: string) => {
  const x = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

/** Lista de cobranças com "Selecionar": marca várias como recebidas ou apaga lançamentos errados de uma vez. */
export function ListaCobrancas({ itens, hoje, mostrarAluno = true }: { itens: LinhaCobranca[]; hoje: string; mostrarAluno?: boolean }) {
  const [selecionando, setSelecionando] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pendente, iniciar] = useTransition();
  const escolhidas = itens.filter((c) => sel.has(c.id));
  const total = escolhidas.reduce((t, c) => t + c.valor, 0);
  const todasPagas = escolhidas.length > 0 && escolhidas.every((c) => c.pago_em);
  const fim = () => { setSel(new Set()); setSelecionando(false); };

  return (
    <div>
      <div className="mb-1 flex justify-end gap-3 text-sm">
        {selecionando && (
          <button type="button" onClick={() => setSel(sel.size === itens.length ? new Set() : new Set(itens.map((c) => c.id)))} className="font-semibold text-texto-suave">
            {sel.size === itens.length ? "Limpar" : "Todas"}
          </button>
        )}
        <button type="button" onClick={() => (selecionando ? fim() : setSelecionando(true))} className="font-semibold text-marca">
          {selecionando ? "Cancelar" : "Selecionar"}
        </button>
      </div>
      <ul className="divide-y divide-borda">
        {itens.map((c) => (
          <ItemCobranca
            key={c.id + (c.pago_em ?? "")}
            c={c}
            hoje={hoje}
            mostrarAluno={mostrarAluno}
            selecao={selecionando ? { marcada: sel.has(c.id), alternar: () => setSel((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; }) } : undefined}
          />
        ))}
      </ul>
      {selecionando && sel.size > 0 && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-menu p-3 text-white shadow-xl md:bottom-4">
          <span className="flex-1 text-sm">{sel.size} selecionada{sel.size > 1 ? "s" : ""} · <b>{moedaBR(total)}</b></span>
          <button
            type="button"
            disabled={pendente}
            onClick={() => iniciar(async () => { await marcarVariasPagas([...sel], !todasPagas); fim(); })}
            className="botao !py-2 text-sm"
          >
            {pendente ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {todasPagas ? "Desfazer recebido" : "Marcar recebidas"}
          </button>
          <button
            type="button"
            disabled={pendente}
            onClick={() => confirm(`Apagar ${sel.size} lançamento${sel.size > 1 ? "s" : ""} (${moedaBR(total)})? Não dá para desfazer.`) && iniciar(async () => { await excluirVarias([...sel]); fim(); })}
            className="flex items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold"
          >
            <Trash2 className="size-4" /> Apagar
          </button>
        </div>
      )}
    </div>
  );
}

/** Uma cobrança: quem, o quê, quanto, quando; o quadradinho marca como recebido. */
export function ItemCobranca({ c, hoje, mostrarAluno = true, selecao }: { c: LinhaCobranca; hoje: string; mostrarAluno?: boolean; selecao?: { marcada: boolean; alternar: () => void } }) {
  const [pendente, iniciar] = useTransition();
  const [pago, setPago] = useState(!!c.pago_em);
  const atrasada = !pago && c.vencimento < hoje;
  const venceHoje = !pago && c.vencimento === hoje;
  return (
    <li className={`flex items-center gap-3 py-2.5 ${selecao?.marcada ? "bg-marca-suave" : ""}`} onClick={selecao?.alternar}>
      {selecao ? (
        <input type="checkbox" checked={selecao.marcada} onChange={selecao.alternar} onClick={(e) => e.stopPropagation()} className="size-5 shrink-0 accent-[var(--marca)]" aria-label="Selecionar" />
      ) : (
      <button
        type="button"
        onClick={() => iniciar(async () => { setPago(!pago); await marcarPago(c.id, !pago); })}
        className={`grid size-9 shrink-0 place-items-center rounded-lg border-2 ${pago ? "border-ok bg-ok text-white" : atrasada ? "border-perigo" : "border-borda"}`}
        aria-label={pago ? "Desmarcar recebido" : "Marcar como recebido"}
      >
        {pendente ? <Loader2 className="size-4 animate-spin" /> : pago && <Check className="size-4" />}
      </button>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {mostrarAluno ? <Link href={`/professor/alunos/${c.aluno_id}`} className="hover:text-marca">{c.aluno}</Link> : c.descricao}
        </p>
        <p className="truncate text-xs text-texto-suave">
          {mostrarAluno && `${c.descricao} · `}
          {c.calculo ? `${textoCalculo(c.calculo, moedaBR)} · ` : ""}
          {c.forma ? `${c.forma} · ` : ""}
          {pago ? `recebido ${dataBR(c.pago_em ?? hoje)}` : `vence ${dataBR(c.vencimento)}`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-sm font-bold ${pago ? "text-ok" : atrasada ? "text-perigo" : ""}`}>{moedaBR(c.valor)}</p>
        {atrasada && <p className="text-[11px] text-perigo">atrasada</p>}
        {venceHoje && <p className="text-[11px] font-semibold text-alerta">vence hoje</p>}
      </div>
      {!selecao && !pago && c.zap && (atrasada || venceHoje) && (
        <a href={c.zap} target="_blank" rel="noopener noreferrer" className="grid size-9 shrink-0 place-items-center rounded-lg text-marca" aria-label="Lembrar pelo WhatsApp"><MessageCircle className="size-4" /></a>
      )}
      {!selecao && (
        <button
          type="button"
          onClick={() => confirm(`Apagar "${c.descricao}" de ${moedaBR(c.valor)}?`) && iniciar(() => excluirCobranca(c.id))}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-texto-suave"
          aria-label="Apagar cobrança"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </li>
  );
}

/** Nova cobrança: parcelas mensais, já pago (integral) ou aulas do personal com a calculadora. */
export function FormCobranca({ alunos, alunoFixo, hoje }: { alunos: { id: string; nome: string; modalidade: string }[]; alunoFixo?: string; hoje: string }) {
  const [estado, enviar, pendente] = useActionState(criarCobranca, undefined);
  const [alunoId, setAlunoId] = useState(alunoFixo ?? "");
  const presencial = alunos.find((a) => a.id === alunoId)?.modalidade !== "consultoria" && !!alunoId;
  const [tipo, setTipo] = useState<"parcelas" | "pago" | "aulas">("parcelas");
  const [calc, setCalc] = useState({ aulas: "", valor_aula: "", aulas_ferias: "", pct_ferias: "30", ajuste: "" });
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const calculo: CalculoAulas = { aulas: n(calc.aulas), valor_aula: n(calc.valor_aula), aulas_ferias: n(calc.aulas_ferias), pct_ferias: n(calc.pct_ferias) || 30, ajuste: n(calc.ajuste) };
  const campo = (k: keyof typeof calc) => ({ name: k, value: calc[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setCalc((c) => ({ ...c, [k]: e.target.value.replace(/[^\d,.-]/g, "") })), inputMode: "decimal" as const, className: "campo" });
  const aba = (t: typeof tipo, rotulo: string) => (
    <button type="button" onClick={() => setTipo(t)} className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold ${tipo === t ? "bg-marca text-white" : "text-texto-suave"}`}>{rotulo}</button>
  );

  return (
    <form action={enviar} className="space-y-4">
      <input type="hidden" name="tipo" value={tipo} />
      {alunoFixo ? (
        <input type="hidden" name="aluno_id" value={alunoFixo} />
      ) : (
        <label className="block">
          <span className="rotulo">Aluno</span>
          <select name="aluno_id" value={alunoId} onChange={(e) => { setAlunoId(e.target.value); if (alunos.find((a) => a.id === e.target.value)?.modalidade === "presencial") setTipo("aulas"); }} className="campo mt-1" required>
            <option value="">Escolha…</option>
            {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}{a.modalidade !== "consultoria" ? " (presencial)" : ""}</option>)}
          </select>
        </label>
      )}

      <div className="flex gap-1 rounded-xl border border-borda p-1">
        {aba("parcelas", "Parcelas")}
        {aba("pago", "Já pago")}
        {aba("aulas", presencial ? "Aulas (personal)" : "Aulas")}
      </div>

      {tipo === "aulas" ? (
        <div className="space-y-3 rounded-xl bg-fundo p-3">
          <p className="flex items-center gap-2 text-sm font-semibold"><Calculator className="size-4 text-marca" /> Calculadora das aulas</p>
          <div className="grid grid-cols-2 gap-3">
            <label><span className="rotulo">Nº de aulas</span><input {...campo("aulas")} inputMode="numeric" placeholder="12" /></label>
            <label><span className="rotulo">Valor da aula (R$)</span><input {...campo("valor_aula")} placeholder="120" /></label>
            <label><span className="rotulo">Aulas em férias</span><input {...campo("aulas_ferias")} inputMode="numeric" placeholder="0" /></label>
            <label><span className="rotulo">% nas férias</span><input {...campo("pct_ferias")} inputMode="numeric" /></label>
            <label className="col-span-2"><span className="rotulo">Ajuste (R$, use − para desconto)</span><input {...campo("ajuste")} placeholder="0" /></label>
          </div>
          <p className="flex items-baseline justify-between border-t border-borda pt-3">
            <span className="text-xs text-texto-suave">{calculo.aulas || calculo.aulas_ferias ? textoCalculo(calculo, moedaBR) : "Preencha as aulas"}</span>
            <span className="text-xl font-bold">{moedaBR(totalAulas(calculo))}</span>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label><span className="rotulo">{tipo === "pago" ? "Valor pago (R$)" : "Valor de cada parcela (R$)"}</span><input name="valor" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ""))} inputMode="decimal" className="campo mt-1" placeholder="1.350" required /></label>
          {tipo === "parcelas" ? (
            <label><span className="rotulo">Nº de parcelas</span><input name="parcelas" value={parcelas} onChange={(e) => setParcelas(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" className="campo mt-1" /></label>
          ) : <span />}
          {tipo === "parcelas" && n(valor) > 0 && Number(parcelas) > 1 && (
            <p className="col-span-2 text-xs text-texto-suave">Total: {moedaBR(n(valor) * Number(parcelas))} em {parcelas} parcelas mensais.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label><span className="rotulo">{tipo === "pago" ? "Data do pagamento" : tipo === "parcelas" ? "1º vencimento" : "Vencimento"}</span><input name="vencimento" type="date" defaultValue={hoje} className="campo mt-1" required /></label>
        <label><span className="rotulo">Forma</span><input name="forma" className="campo mt-1" placeholder="Pix, cartão…" /></label>
        <label className="col-span-2"><span className="rotulo">Descrição</span><input name="descricao" className="campo mt-1" placeholder={tipo === "aulas" ? "Aulas de dezembro" : "Consultoria semestral"} /></label>
      </div>

      <button className="botao w-full" disabled={pendente}>{pendente ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Salvar</button>
      {estado?.ok && <p className="text-sm text-ok">{estado.ok}</p>}
      {estado?.erro && <p className="text-sm text-perigo">{estado.erro}</p>}
    </form>
  );
}
