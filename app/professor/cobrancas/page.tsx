import { AlertTriangle, CalendarClock, CheckCircle2, Plus, Wallet } from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { hojeEmBH } from "@/lib/ciclo";
import { linkWhatsapp, moedaBR } from "@/lib/formato";
import { Cartao, TituloCartao } from "@/components/ui";
import { FormCobranca, ItemCobranca, type LinhaCobranca } from "@/components/professor/cobrancas";
import { somarMeses, type CalculoAulas } from "@/lib/cobranca";

export const metadata = { title: "Cobranças · Painel do Professor" };

type Linha = Omit<LinhaCobranca, "aluno" | "zap"> & { alunos: { nome: string; telefone: string | null } };

/** Mensagem pronta para lembrar o aluno do pagamento. */
const lembrete = (nome: string, valor: number, vencimento: string, hoje: string) =>
  `Oi, ${nome.split(" ")[0]}! Passando para lembrar do pagamento de ${moedaBR(valor)} ${vencimento < hoje ? "que venceu" : "que vence hoje"}. Qualquer coisa me fala 🙂`;

export default async function Cobrancas() {
  const { supabase } = await exigirProfessor();
  const hoje = hojeEmBH();
  const em30 = somarMeses(hoje, 1);
  const mes = hoje.slice(0, 7);

  const [abertasR, pagasR, alunosR] = await Promise.all([
    supabase.from("cobrancas").select("*, alunos(nome, telefone)").is("pago_em", null).order("vencimento"),
    supabase.from("cobrancas").select("*, alunos(nome, telefone)").not("pago_em", "is", null).order("pago_em", { ascending: false }).limit(200),
    supabase.from("alunos").select("id, nome, modalidade").neq("situacao", "inativo").order("nome"),
  ]);
  const montar = (l: Linha): LinhaCobranca => ({
    ...l,
    valor: Number(l.valor),
    calculo: (l.calculo as CalculoAulas | null) ?? null,
    aluno: l.alunos?.nome ?? "Aluno",
    zap: linkWhatsapp(l.alunos?.telefone, lembrete(l.alunos?.nome ?? "", Number(l.valor), l.vencimento, hoje)),
  });
  const abertas = ((abertasR.data ?? []) as Linha[]).map(montar);
  const pagas = ((pagasR.data ?? []) as Linha[]).map(montar);

  const atrasadas = abertas.filter((c) => c.vencimento < hoje);
  const proximas = abertas.filter((c) => c.vencimento >= hoje && c.vencimento <= em30);
  const depois = abertas.filter((c) => c.vencimento > em30);
  const soma = (l: LinhaCobranca[]) => l.reduce((t, c) => t + c.valor, 0);
  const recebidoMes = soma(pagas.filter((c) => c.pago_em?.startsWith(mes)));
  const aReceberMes = soma(abertas.filter((c) => c.vencimento.startsWith(mes)));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cobranças</h1>
        <p className="text-sm text-texto-suave">Toque no quadradinho quando receber. No dia do vencimento chega um aviso no seu celular.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="cartao p-3 text-center"><p className="text-xs text-texto-suave">Recebido no mês</p><p className="text-lg font-bold text-ok">{moedaBR(recebidoMes)}</p></div>
        <div className="cartao p-3 text-center"><p className="text-xs text-texto-suave">A receber no mês</p><p className="text-lg font-bold">{moedaBR(aReceberMes)}</p></div>
        <div className="cartao p-3 text-center"><p className="text-xs text-texto-suave">Atrasado</p><p className={`text-lg font-bold ${atrasadas.length ? "text-perigo" : ""}`}>{moedaBR(soma(atrasadas))}</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {atrasadas.length > 0 && (
            <Cartao>
              <TituloCartao icone={AlertTriangle} acao={<span className="text-sm font-bold text-perigo">{atrasadas.length}</span>}>Atrasadas</TituloCartao>
              <ul className="divide-y divide-borda">{atrasadas.map((c) => <ItemCobranca key={c.id} c={c} hoje={hoje} />)}</ul>
            </Cartao>
          )}
          <Cartao>
            <TituloCartao icone={CalendarClock} acao={<span className="text-sm font-bold">{moedaBR(soma(proximas))}</span>}>Próximos 30 dias</TituloCartao>
            {proximas.length ? (
              <ul className="divide-y divide-borda">{proximas.map((c) => <ItemCobranca key={c.id} c={c} hoje={hoje} />)}</ul>
            ) : (
              <p className="text-sm text-texto-suave">Nada vencendo nos próximos 30 dias.</p>
            )}
          </Cartao>
          {depois.length > 0 && (
            <details className="cartao p-4">
              <summary className="cursor-pointer font-semibold">Mais para frente ({depois.length} · {moedaBR(soma(depois))})</summary>
              <ul className="mt-2 divide-y divide-borda">{depois.map((c) => <ItemCobranca key={c.id} c={c} hoje={hoje} />)}</ul>
            </details>
          )}
          <details className="cartao p-4">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold"><CheckCircle2 className="size-4 text-ok" /> Recebidas ({pagas.length})</summary>
            <ul className="mt-2 divide-y divide-borda">{pagas.map((c) => <ItemCobranca key={c.id} c={c} hoje={hoje} />)}</ul>
          </details>
        </div>

        <Cartao>
          <TituloCartao icone={Plus}>Nova cobrança</TituloCartao>
          <FormCobranca alunos={alunosR.data ?? []} hoje={hoje} />
        </Cartao>
      </div>

      {!abertas.length && !pagas.length && (
        <p className="flex items-center gap-2 text-sm text-texto-suave"><Wallet className="size-4" /> Comece cadastrando os alunos: quem pagou integral entra em &quot;Já pago&quot;; quem parcela, em &quot;Parcelas&quot;.</p>
      )}
    </div>
  );
}
