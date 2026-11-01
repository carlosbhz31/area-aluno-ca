import { Salad, Settings, Trophy, UserX } from "lucide-react";
import { NOME_ACAO_PONTOS, REGRAS_PADRAO } from "@/lib/gamificacao";
import { FAIXAS_PADRAO } from "@/lib/ligas";
import { exigirProfessor } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/servidor";
import { dataBR } from "@/lib/formato";
import { Cartao, TituloCartao } from "@/components/ui";
import { FormConfiguracoes, FormJogo, FormNutricionista } from "@/components/professor/formularios";
import { liberarNutricionista, removerNutricionista, salvarConfiguracoes, salvarJogo } from "../acoes";

export const metadata = { title: "Configurações · Painel do Professor" };

export default async function Configuracoes() {
  const { supabase } = await exigirProfessor();
  const { data } = await supabase.from("configuracoes").select("chave, valor").in("chave", ["whatsapp_carlos", "link_agenda", "dia_padrao_acompanhamento"]);
  const c = Object.fromEntries((data ?? []).map((x) => [x.chave, x.valor]));
  const { data: dadosJogo } = await supabase.from("configuracoes").select("chave, valor").in("chave", ["regras_pontos", "faixas_ligas"]);
  const jogo = Object.fromEntries((dadosJogo ?? []).map((x) => [x.chave, x.valor]));

  // Nutricionistas com acesso (e-mail vem do serviço de login)
  const admin = clienteAdmin();
  const { data: perfis } = await admin.from("perfis").select("id").eq("papel", "nutricionista");
  const nutris = await Promise.all(
    (perfis ?? []).map(async (p) => {
      const { data: u } = await admin.auth.admin.getUserById(p.id);
      return { id: p.id, email: u.user?.email ?? "—", ultimo: u.user?.last_sign_in_at ?? null };
    }),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-texto-suave">Valem para todos os alunos.</p>
      </div>

      <Cartao>
        <TituloCartao icone={Settings}>Contato e acompanhamento</TituloCartao>
        <FormConfiguracoes
          acao={salvarConfiguracoes}
          valores={{ whatsapp: (c.whatsapp_carlos as string) || null, agenda: (c.link_agenda as string) || null, dia: Number(c.dia_padrao_acompanhamento ?? 1) }}
        />
      </Cartao>

      <Cartao>
        <TituloCartao icone={Trophy}>Pontos e ligas</TituloCartao>
        <FormJogo
          acao={salvarJogo}
          regras={{ ...REGRAS_PADRAO, ...((jogo.regras_pontos as Record<string, number>) ?? {}) }}
          nomes={NOME_ACAO_PONTOS}
          faixas={(jogo.faixas_ligas as { liga: string; min: number }[]) ?? FAIXAS_PADRAO}
        />
      </Cartao>

      <Cartao>
        <TituloCartao icone={Salad}>Acesso da nutricionista</TituloCartao>
        <p className="mb-4 text-sm text-texto-suave">
          Ela entra com o e-mail (link de acesso, sem senha) e vê só o nome dos alunos com plano alimentar, para anexar e trocar os PDFs.
          Não vê valores, contatos, check-ins, fotos nem anamnese.
        </p>
        {nutris.length > 0 && (
          <ul className="mb-4 divide-y divide-borda rounded-xl border border-borda">
            {nutris.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="block font-semibold">{n.email}</span>
                  <span className="text-xs text-texto-suave">{n.ultimo ? `Último acesso ${dataBR(n.ultimo)}` : "Ainda não entrou"}</span>
                </span>
                <form action={removerNutricionista.bind(null, n.id)}>
                  <button className="flex items-center gap-1 text-sm font-semibold text-perigo"><UserX className="size-4" /> Tirar acesso</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <FormNutricionista acao={liberarNutricionista} />
      </Cartao>
    </div>
  );
}
