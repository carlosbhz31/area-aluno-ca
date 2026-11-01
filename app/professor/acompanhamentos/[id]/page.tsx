import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ClipboardList, MessageCircleReply } from "lucide-react";
import { exigirProfessor } from "@/lib/sessao";
import { ESCALA, sinaisDeAlerta, type Respostas } from "@/lib/acompanhamento";
import { dataBR } from "@/lib/formato";
import { Cartao, Selo, TituloCartao } from "@/components/ui";
import { FormResposta } from "@/components/professor/formularios";
import { responderAcompanhamento } from "../../acoes";

export const metadata = { title: "Acompanhamento · Painel do Professor" };

export default async function VerAcompanhamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirProfessor();
  const { data: a } = await supabase
    .from("acompanhamentos")
    .select("*, alunos(id, nome)")
    .eq("id", id)
    .maybeSingle();
  if (!a) notFound();

  const aluno = (Array.isArray(a.alunos) ? a.alunos[0] : a.alunos) as { id: string; nome: string };
  const r = a.respostas as Partial<Respostas>;
  const sinais = sinaisDeAlerta(r);

  // Envios anteriores para comparar
  const { data: anteriores } = await supabase
    .from("acompanhamentos")
    .select("id, semana, enviado_em, respostas")
    .eq("aluno_id", aluno.id)
    .lt("enviado_em", a.enviado_em)
    .order("enviado_em", { ascending: false })
    .limit(3);

  const linhas: [string, string][] = [
    ["Treinos", r.treinos_feitos != null ? `${r.treinos_feitos}${r.treinos_planejados ? ` de ${r.treinos_planejados}` : ""}` : "—"],
    ["Cardio", r.cardio_vezes != null ? `${r.cardio_vezes}x` : "—"],
    ["Seguiu o plano", r.aderencia ? `${r.aderencia} · ${ESCALA[r.aderencia]}` : "—"],
    ["Sono", r.sono ? `${r.sono} · ${ESCALA[r.sono]}` : "—"],
    ["Energia", r.energia ? `${r.energia} · ${ESCALA[r.energia]}` : "—"],
    ["Dor", r.dor ? r.dor_onde || "Sim" : "Não"],
    ["Recorde", r.recorde || "—"],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/professor/hoje" className="inline-flex items-center gap-1 text-sm text-texto-suave hover:text-marca">
        <ArrowLeft className="size-4" /> Hoje
      </Link>

      <header>
        <Link href={`/professor/alunos/${aluno.id}`} className="text-2xl font-bold hover:text-marca">{aluno.nome}</Link>
        <p className="text-sm text-texto-suave">{a.semana ? `Semana ${a.semana} do ciclo · ` : ""}enviado em {dataBR(a.enviado_em)}</p>
        {sinais.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">{sinais.map((s) => <Selo key={s} tom="alerta"><AlertTriangle className="size-3" /> {s}</Selo>)}</div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao>
          <TituloCartao icone={ClipboardList}>Respostas</TituloCartao>
          <dl className="divide-y divide-borda text-sm">
            {linhas.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-texto-suave">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
            ))}
          </dl>
          {r.duvidas && (
            <div className="mt-4 rounded-xl bg-fundo p-3 text-sm">
              <p className="rotulo mb-1">Dúvidas / recado</p>
              <p className="whitespace-pre-line">{r.duvidas}</p>
            </div>
          )}
        </Cartao>

        <Cartao>
          <TituloCartao icone={MessageCircleReply} acao={a.respondido_em && <span className="text-xs text-texto-suave">{a.resposta_lida_em ? `Lida em ${dataBR(a.resposta_lida_em)}` : "Ainda não lida"}</span>}>
            Sua resposta
          </TituloCartao>
          <FormResposta acao={responderAcompanhamento.bind(null, a.id, aluno.id)} resposta={a.resposta_professor} atencao={a.atencao} />
        </Cartao>
      </div>

      {anteriores && anteriores.length > 0 && (
        <Cartao>
          <TituloCartao icone={ClipboardList}>Semanas anteriores</TituloCartao>
          <ul className="space-y-2 text-sm">
            {anteriores.map((p) => {
              const q = p.respostas as Partial<Respostas>;
              return (
                <li key={p.id}>
                  <Link href={`/professor/acompanhamentos/${p.id}`} className="flex justify-between gap-3 hover:text-marca">
                    <span>{p.semana ? `Semana ${p.semana}` : dataBR(p.enviado_em)}</span>
                    <span className="text-texto-suave">
                      Treinos {q.treinos_feitos ?? "—"}{q.treinos_planejados ? `/${q.treinos_planejados}` : ""} · sono {q.sono ?? "—"} · energia {q.energia ?? "—"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
