import { Settings } from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { Cartao, TituloCartao } from "@/components/ui";
import { FormConfiguracoes } from "@/components/professor/formularios";
import { salvarConfiguracoes } from "../acoes";

export const metadata = { title: "Configurações · Painel do Professor" };

export default async function Configuracoes() {
  const { supabase } = await exigirProfessor();
  const { data } = await supabase.from("configuracoes").select("chave, valor").in("chave", ["whatsapp_carlos", "link_agenda", "dia_padrao_acompanhamento"]);
  const c = Object.fromEntries((data ?? []).map((x) => [x.chave, x.valor]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-texto-suave">Valem para todos os alunos. Pontos e ligas entram aqui na próxima etapa.</p>
      </div>
      <Cartao>
        <TituloCartao icone={Settings}>Contato e acompanhamento</TituloCartao>
        <FormConfiguracoes
          acao={salvarConfiguracoes}
          valores={{ whatsapp: (c.whatsapp_carlos as string) ?? null, agenda: (c.link_agenda as string) ?? null, dia: Number(c.dia_padrao_acompanhamento ?? 1) }}
        />
      </Cartao>
    </div>
  );
}
