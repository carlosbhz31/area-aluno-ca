"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { videoYoutube } from "@/lib/treino";

/** Vídeo do YouTube por cima da tela do treino: o aluno assiste, fecha e continua de onde parou. */
export function VideoSobreposto({ url, titulo, fechar }: { url: string; titulo: string; fechar: () => void }) {
  const v = videoYoutube(url);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = rolagem;
      window.removeEventListener("keydown", tecla);
    };
  }, [fechar]);

  if (!v) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" role="dialog" aria-modal="true" aria-label={`Vídeo: ${titulo}`} onClick={fechar}>
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <p className="min-w-0 flex-1 truncate font-semibold">{titulo}</p>
        <button onClick={fechar} className="flex items-center gap-1 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold" aria-label="Fechar vídeo">
          <X className="size-4" /> Fechar
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-4">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
          title={titulo}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onClick={(e) => e.stopPropagation()}
          className={`max-h-full rounded-xl bg-black ${v.vertical ? "aspect-[9/16] h-[min(60dvh,30rem)] w-auto" : "aspect-video w-full max-w-md"}`}
        />
      </div>
    </div>
  );
}
