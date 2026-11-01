import Link from "next/link";
import { Briefcase, ChevronRight, ClipboardPen, FileText, LineChart, LogOut, Salad, ShieldCheck, Smartphone } from "lucide-react";
import { exigirAluno } from "@/lib/sessao";
import { AtivarAvisos } from "@/components/aluno/ativar-avisos";
import { HorarioSilencioso } from "@/components/aluno/horario-silencioso";

export default async function Mais() {
  const s = await exigirAluno();
  const { data: aluno } = await s.supabase.from("alunos").select("tem_nutricao, silencio_inicio, silencio_fim").eq("user_id", s.user.id).maybeSingle();

  const itens = [
    { href: "/evolucao", icone: LineChart, titulo: "Evolução", texto: "Peso, medidas e fotos." },
    { href: "/plano", icone: FileText, titulo: "Meu plano", texto: "Ciclo atual, datas da consultoria e recados." },
    ...(aluno?.tem_nutricao ? [{ href: "/nutricao", icone: Salad, titulo: "Nutrição", texto: "Seu plano alimentar em PDF." }] : []),
    { href: "/anamnese", icone: ClipboardPen, titulo: "Anamnese", texto: "Questionário inicial e de realinhamento." },
    { href: "/privacidade", icone: ShieldCheck, titulo: "Termos e privacidade", texto: "O que eu guardo, quem vê e seus direitos." },
    ...(s.papel === "professor" ? [{ href: "/professor/hoje", icone: Briefcase, titulo: "Voltar ao painel do professor", texto: "Você está usando a área do aluno como aluno." }] : []),
  ];

  return (
    <div className="mx-auto max-w-xl space-y-4 pt-2">
      <h1 className="text-2xl font-bold">Mais</h1>

      <ul className="cartao divide-y divide-borda">
        {itens.map(({ href, icone: Icone, titulo, texto }) => {
          const conteudo = (
            <>
              <span className="grid size-10 place-items-center rounded-xl bg-marca-suave text-marca"><Icone className="size-5" /></span>
              <span className="flex-1">
                <span className="block font-semibold">{titulo}</span>
                <span className="text-sm text-texto-suave">{texto}</span>
              </span>
              {href ? <ChevronRight className="size-5 text-texto-suave" /> : <span className="text-xs font-semibold text-texto-suave">em breve</span>}
            </>
          );
          return (
            <li key={titulo}>
              {href ? <Link href={href} className="flex items-center gap-3 p-4">{conteudo}</Link> : <div className="flex items-center gap-3 p-4">{conteudo}</div>}
            </li>
          );
        })}
      </ul>

      <AtivarAvisos />
      {aluno && <HorarioSilencioso inicio={aluno.silencio_inicio} fim={aluno.silencio_fim} />}

      <section className="cartao p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Smartphone className="size-5 text-marca" /> Coloca o app na tela inicial</h2>
        <div className="mt-3 space-y-3 text-sm text-texto-suave">
          <p><strong className="text-texto">iPhone (Safari):</strong> toca em Compartilhar <ChevronRight className="inline size-3" /> Adicionar à Tela de Início.</p>
          <p><strong className="text-texto">Android (Chrome):</strong> toca nos três pontinhos <ChevronRight className="inline size-3" /> Instalar app.</p>
        </div>
      </section>

      <form action="/auth/sair" method="post">
        <button className="botao-secundario w-full"><LogOut className="size-4" /> Sair</button>
      </form>
    </div>
  );
}
