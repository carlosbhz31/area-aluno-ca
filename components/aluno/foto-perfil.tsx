"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { salvarFotoPerfil } from "@/app/(aluno)/acoes";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { Avatar } from "../ui";
import { RecortarFoto } from "./recortar-foto";

/** Foto de perfil do aluno: toca para escolher (galeria ou câmera), ajusta o recorte e salva. */
export function FotoPerfil({ alunoId, nome, url }: { alunoId: string; nome: string; url: string | null }) {
  const entrada = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [previa, setPrevia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recortar, setRecortar] = useState<File | null>(null);

  function escolher(ev: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = ev.target.files?.[0];
    ev.target.value = "";
    if (arquivo) setRecortar(arquivo);
  }

  async function enviar(blob: Blob) {
    setRecortar(null);
    setErro(null);
    setEnviando(true);
    try {
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
      {recortar && <RecortarFoto arquivo={recortar} pronto={enviar} cancelar={() => setRecortar(null)} />}
    </section>
  );
}
