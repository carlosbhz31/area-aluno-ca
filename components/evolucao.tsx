import type { SupabaseClient } from "@supabase/supabase-js";
import { Images, LineChart, Scale } from "lucide-react";
import { dataBR, numeroBR } from "@/lib/formato";
import { GraficoPeso } from "./aluno/grafico-peso";
import { Cartao, TituloCartao, Vazio } from "./ui";

type Registro = {
  id: string;
  data: string;
  peso: number | null;
  medidas: Record<string, number> | null;
  foto_frente_path: string | null;
  foto_lado_path: string | null;
  foto_costas_path: string | null;
};

const NOME_MEDIDA: Record<string, string> = { cintura: "Cintura", abdomen: "Abdômen", quadril: "Quadril", braco: "Braço", coxa: "Coxa" };

/** Evolução de um aluno (peso, medidas e fotos). Fotos abrem por links temporários de 1 hora. */
export async function PainelEvolucao({ supabase, alunoId }: { supabase: SupabaseClient; alunoId: string }) {
  const { data } = await supabase
    .from("registros_evolucao")
    .select("id, data, peso, medidas, foto_frente_path, foto_lado_path, foto_costas_path")
    .eq("aluno_id", alunoId)
    .order("data", { ascending: true });
  const registros = (data ?? []) as Registro[];

  const caminhos = registros.flatMap((r) => [r.foto_frente_path, r.foto_lado_path, r.foto_costas_path]).filter((p): p is string => !!p);
  const links = new Map<string, string>();
  if (caminhos.length) {
    const { data: assinados } = await supabase.storage.from("fotos").createSignedUrls(caminhos, 3600);
    (assinados ?? []).forEach((a) => a.signedUrl && a.path && links.set(a.path, a.signedUrl));
  }

  const pesos = registros.filter((r) => r.peso != null).map((r) => ({ data: r.data, peso: Number(r.peso) }));
  const comFoto = registros.filter((r) => r.foto_frente_path || r.foto_lado_path || r.foto_costas_path);
  const antes = comFoto[0];
  const depois = comFoto.length > 1 ? comFoto[comFoto.length - 1] : null;
  const variacao = pesos.length > 1 ? pesos[pesos.length - 1].peso - pesos[0].peso : null;

  if (!registros.length) {
    return (
      <Cartao>
        <Vazio icone={LineChart} titulo="Nenhum registro ainda">O primeiro peso ou foto já começa o gráfico e o antes e depois.</Vazio>
      </Cartao>
    );
  }

  return (
    <div className="space-y-4">
      <Cartao>
        <TituloCartao icone={Scale}>Peso</TituloCartao>
        {pesos.length ? (
          <>
            <div className="mb-2 flex items-end gap-3">
              <p className="text-3xl font-bold">{numeroBR(pesos[pesos.length - 1].peso)} <span className="text-base font-semibold text-texto-suave">kg</span></p>
              {variacao != null && (
                <p className="pb-1 text-sm font-semibold text-texto-suave">
                  {variacao > 0 ? "+" : ""}{numeroBR(variacao)} kg desde {dataBR(pesos[0].data)}
                </p>
              )}
            </div>
            <GraficoPeso pontos={pesos} />
            {pesos.length < 2 && <p className="text-xs text-texto-suave">Com dois registros o gráfico aparece.</p>}
          </>
        ) : (
          <p className="text-sm text-texto-suave">Sem peso registrado.</p>
        )}
      </Cartao>

      {antes && (
        <Cartao>
          <TituloCartao icone={Images}>{depois ? "Antes e depois" : "Primeiras fotos"}</TituloCartao>
          <div className={`grid gap-3 ${depois ? "grid-cols-2" : "grid-cols-1"}`}>
            {[antes, depois].filter((r): r is Registro => !!r).map((r) => {
              const p = r.foto_frente_path ?? r.foto_lado_path ?? r.foto_costas_path;
              return (
                <figure key={r.id}>
                  {p && links.get(p) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={links.get(p)} alt={`Foto de ${dataBR(r.data)}`} className="aspect-[3/4] w-full rounded-xl object-cover" />
                  )}
                  <figcaption className="mt-1 text-center text-xs text-texto-suave">{dataBR(r.data)}{r.peso ? ` · ${numeroBR(r.peso)} kg` : ""}</figcaption>
                </figure>
              );
            })}
          </div>
        </Cartao>
      )}

      <Cartao>
        <TituloCartao icone={LineChart}>Registros</TituloCartao>
        <ul className="divide-y divide-borda">
          {[...registros].reverse().map((r) => {
            const fotos = [r.foto_frente_path, r.foto_lado_path, r.foto_costas_path].filter((p): p is string => !!p && links.has(p));
            return (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold">{dataBR(r.data)}</span>
                  <span>{r.peso ? `${numeroBR(r.peso)} kg` : ""}</span>
                </div>
                {r.medidas && (
                  <p className="mt-0.5 text-xs text-texto-suave">
                    {Object.entries(r.medidas).map(([k, v]) => `${NOME_MEDIDA[k] ?? k} ${numeroBR(v)} cm`).join(" · ")}
                  </p>
                )}
                {fotos.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {fotos.map((p) => (
                      <a key={p} href={links.get(p)} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={links.get(p)} alt="" className="size-16 rounded-lg object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Cartao>
    </div>
  );
}
