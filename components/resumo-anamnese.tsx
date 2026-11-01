import { etapasDo, textoResposta, visivel, type RespostasAnamnese, type TipoAnamnese } from "@/lib/anamnese";

/** Respostas da anamnese por etapa. Serve para o aluno e para a ficha do professor. */
export function ResumoAnamnese({ tipo, respostas, fotos }: { tipo: TipoAnamnese; respostas: RespostasAnamnese; fotos: Record<string, string> }) {
  return (
    <div className="space-y-4">
      {etapasDo(tipo).map((e) => {
        const r = respostas[e.id] ?? {};
        return (
          <section key={e.id} className="cartao p-5">
            <h2 className="font-bold">{e.titulo}</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {e.perguntas.filter((p) => visivel(p, r)).map((p) => {
                const v = r[p.id];
                if (p.tipo === "fotos") {
                  const lista = Array.isArray(v) ? v : [];
                  if (!lista.length) return null;
                  return (
                    <div key={p.id}>
                      <dt className="text-texto-suave">{p.texto}</dt>
                      <dd className="mt-1.5 flex flex-wrap gap-2">
                        {lista.map((c) => fotos[c] && (
                          <a key={c} href={fotos[c]} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={fotos[c]} alt="" className="size-24 rounded-xl object-cover ring-1 ring-borda" />
                          </a>
                        ))}
                      </dd>
                    </div>
                  );
                }
                const t = textoResposta(p, v);
                return (
                  <div key={p.id}>
                    <dt className="text-texto-suave">{p.texto}</dt>
                    <dd className={`mt-0.5 whitespace-pre-line font-medium ${t ? "" : "text-texto-suave/60"}`}>{t ?? "—"}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
    </div>
  );
}