"use client";

import { useActionState, useState } from "react";
import { Camera, CheckCircle2, ChevronDown, Loader2, Save } from "lucide-react";
import { registrarEvolucao, type Resultado } from "@/app/(aluno)/acoes";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { hojeEmBH } from "@/lib/ciclo";

const POSES = [
  { id: "frente", rotulo: "Frente" },
  { id: "lado", rotulo: "Lado" },
  { id: "costas", rotulo: "Costas" },
] as const;

/** Reduz a foto (máx. 1600 px, JPEG) antes de enviar: sobe rápido e ocupa menos espaço. */
async function reduzir(arquivo: File): Promise<Blob> {
  try {
    const img = await createImageBitmap(arquivo);
    const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error("foto"))), "image/jpeg", 0.82));
  } catch {
    return arquivo; // formato que o navegador não abre: manda como veio
  }
}

export function FormEvolucao({ alunoId }: { alunoId: string }) {
  const [previas, setPrevias] = useState<Record<string, string>>({});
  const [medidasAbertas, setMedidasAbertas] = useState(false);
  const [rodada, setRodada] = useState(0); // muda a cada registro salvo para limpar o formulário

  async function enviar(anterior: Resultado, f: FormData): Promise<Resultado> {
    const supabase = clienteNavegador();
    const data = String(f.get("data") || hojeEmBH());
    for (const { id } of POSES) {
      const arquivo = f.get(`arquivo_${id}`);
      f.delete(`arquivo_${id}`);
      if (!(arquivo instanceof File) || arquivo.size === 0) continue;
      const blob = await reduzir(arquivo);
      const caminho = `${alunoId}/${data}-${id}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("fotos").upload(caminho, blob, { contentType: "image/jpeg", upsert: false });
      if (error) return { erro: "Não consegui enviar a foto. Confere a internet e tenta de novo." };
      f.set(`foto_${id}`, caminho);
    }
    const r = await registrarEvolucao(anterior, f);
    if (r?.ok) {
      setPrevias({});
      setRodada((n) => n + 1);
    }
    return r;
  }

  const [estado, acao, pendente] = useActionState(enviar, undefined);

  return (
    <form action={acao} className="cartao space-y-4 p-5" key={rodada}>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="rotulo">Data</span>
          <input name="data" type="date" defaultValue={hojeEmBH()} max={hojeEmBH()} className="campo mt-1" />
        </label>
        <label>
          <span className="rotulo">Peso (kg)</span>
          <input name="peso" inputMode="decimal" placeholder="Ex.: 72,4" className="campo mt-1" />
        </label>
      </div>

      <button type="button" onClick={() => setMedidasAbertas(!medidasAbertas)} className="flex items-center gap-1 text-sm font-semibold text-marca">
        Medidas (cm) <ChevronDown className={`size-4 transition ${medidasAbertas ? "rotate-180" : ""}`} />
      </button>
      {medidasAbertas && (
        <div className="grid grid-cols-2 gap-3">
          {[["cintura", "Cintura"], ["abdomen", "Abdômen"], ["quadril", "Quadril"], ["braco", "Braço"], ["coxa", "Coxa"]].map(([id, rotulo]) => (
            <label key={id}>
              <span className="rotulo">{rotulo}</span>
              <input name={id} inputMode="decimal" className="campo mt-1" />
            </label>
          ))}
        </div>
      )}

      <div>
        <p className="rotulo mb-2">Fotos (opcional · só você e o Carlos veem)</p>
        <div className="grid grid-cols-3 gap-2">
          {POSES.map(({ id, rotulo }) => (
            <label key={id} className="relative grid aspect-[3/4] cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-borda bg-fundo text-center text-xs text-texto-suave">
              {previas[id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previas[id]} alt={rotulo} className="absolute inset-0 size-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1"><Camera className="size-5" />{rotulo}</span>
              )}
              <input
                type="file"
                name={`arquivo_${id}`}
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const arq = e.target.files?.[0];
                  if (arq) setPrevias((p) => ({ ...p, [id]: URL.createObjectURL(arq) }));
                }}
              />
            </label>
          ))}
        </div>
      </div>

      {estado?.erro && <p className="text-sm font-semibold text-perigo">{estado.erro}</p>}
      {estado?.ok && <p className="flex items-center gap-1.5 text-sm font-semibold text-ok"><CheckCircle2 className="size-4" /> {estado.ok}</p>}
      <button className="botao w-full" disabled={pendente}>
        {pendente ? <><Loader2 className="size-4 animate-spin" /> Enviando…</> : <><Save className="size-4" /> Registrar</>}
      </button>
    </form>
  );
}
