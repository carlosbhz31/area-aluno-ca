"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { salvarFotoPerfil } from "@/app/(aluno)/acoes";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { Avatar } from "../ui";

/** Recorta o centro da foto em quadrado (512 px, JPEG): fica leve e redonda certinha. */
async function quadrado(arquivo: File): Promise<Blob> {
  const img = await createImageBitmap(arquivo);
  const lado = Math.min(img.width, img.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(512, lado);
  canvas.getContext("2d")!.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, canvas.width, canvas.height);
  return await new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error("foto"))), "image/jpeg", 0.85));
}

/** Foto de perfil do aluno: toca para escolher (galeria ou câmera) e já salva. */
export function FotoPerfil({ alunoId, nome, url }: { alunoId: string; nome: string; url: string | null }) {
  const entrada = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [previa, setPrevia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(ev: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = ev.target.files?.[0];
    ev.target.value = "";
    if (!arquivo) return;
    setErro(null);
    setEnviando(true);
    try {
      const blob = await quadrado(arquivo);
      setPrevia(URL.createObjectURL(blob));
      const caminho = `${alunoId}/perfil-${Date.now()}.jpg`;
      const { error } = await clienteNavegador().storage.from("fotos").upload(caminho, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      const r = await salvarFotoPerfil(caminho);
      if (r?.erro) throw new Error(r.erro);
      router.refresh();
    } catch {
      setPrevia(null);
      setErro("Não consegui enviar a foto. Confere a internet e tenta de novo.");
    }
    setEnviando(false);
  }

  return (
    <section className="cartao flex items-center gap-4 p-4">
      <button type="button" onClick={() => entrada.current?.click()} className="relative" aria-label="Trocar foto de perfil" disabled={enviando}>
        <Avatar nome={nome} url={previa ?? url} className="size-16 text-xl" />
        <span className="absolute -bottom-0.5 -right-0.5 grid size-7 place-items-center rounded-full border-2 border-cartao bg-marca text-white">
          {enviando ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{nome}</p>
        <button type="button" onClick={() => entrada.current?.click()} className="text-sm font-semibold text-marca" disabled={enviando}>
          {enviando ? "Enviando..." : url || previa ? "Trocar foto" : "Colocar foto de perfil"}
        </button>
        {erro && <p className="mt-1 text-xs text-perigo">{erro}</p>}
      </div>
      <input ref={entrada} type="file" accept="image/*" className="hidden" onChange={escolher} />
    </section>
  );
}
