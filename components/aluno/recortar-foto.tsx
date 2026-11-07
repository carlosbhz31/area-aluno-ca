"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, ZoomIn } from "lucide-react";

const V = 280; // tamanho do círculo na tela (px)

/** Recorte da foto de perfil: arrasta para posicionar e usa a barra para dar zoom. Devolve um JPEG quadrado de 512 px. */
export function RecortarFoto({ arquivo, pronto, cancelar }: { arquivo: File; pronto: (b: Blob) => void; cancelar: () => void }) {
  const [url] = useState(() => URL.createObjectURL(arquivo));
  const img = useRef<HTMLImageElement>(null);
  const [tam, setTam] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const escala = tam ? (V / Math.min(tam.w, tam.h)) * zoom : 1;
  /** Não deixa sobrar espaço vazio dentro do círculo. */
  const limitar = (x: number, y: number, e = escala) =>
    tam ? { x: Math.min(0, Math.max(V - tam.w * e, x)), y: Math.min(0, Math.max(V - tam.h * e, y)) } : { x, y };

  function carregou() {
    const el = img.current!;
    const t = { w: el.naturalWidth, h: el.naturalHeight };
    setTam(t);
    const e = V / Math.min(t.w, t.h);
    setPos({ x: (V - t.w * e) / 2, y: (V - t.h * e) / 2 });
  }

  function mudarZoom(z: number) {
    if (!tam) return;
    // zoom pelo centro do círculo
    const nova = (V / Math.min(tam.w, tam.h)) * z;
    const cx = (V / 2 - pos.x) / escala;
    const cy = (V / 2 - pos.y) / escala;
    setZoom(z);
    setPos(limitar(V / 2 - cx * nova, V / 2 - cy * nova, nova));
  }

  async function confirmar() {
    if (!tam || !img.current) return;
    const lado = Math.min(512, Math.round(V / escala));
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.max(64, lado);
    canvas.getContext("2d")!.drawImage(img.current, -pos.x / escala, -pos.y / escala, V / escala, V / escala, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => b && pronto(b), "image/jpeg", 0.85);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/90 p-4 text-white" role="dialog" aria-modal="true" aria-label="Ajustar foto de perfil">
      <p className="font-semibold">Arraste para posicionar a foto</p>
      <div
        className="relative touch-none overflow-hidden rounded-full ring-2 ring-white/70"
        style={{ width: V, height: V }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          arrasto.current = { px: e.clientX, py: e.clientY, ...pos };
        }}
        onPointerMove={(e) => {
          const a = arrasto.current;
          if (a) setPos(limitar(a.x + e.clientX - a.px, a.y + e.clientY - a.py));
        }}
        onPointerUp={() => (arrasto.current = null)}
        onPointerCancel={() => (arrasto.current = null)}
      >
        <img
          ref={img}
          src={url}
          alt=""
          onLoad={carregou}
          draggable={false}
          className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
          style={tam ? { width: tam.w * escala, height: tam.h * escala, transform: `translate(${pos.x}px, ${pos.y}px)` } : { opacity: 0 }}
        />
      </div>
      <label className="flex w-full max-w-[280px] items-center gap-3">
        <ZoomIn className="size-5 shrink-0" />
        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => mudarZoom(Number(e.target.value))} className="w-full accent-[var(--marca)]" aria-label="Zoom" />
      </label>
      <div className="flex w-full max-w-[280px] gap-2">
        <button type="button" onClick={cancelar} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-white/15 py-3 font-semibold"><X className="size-4" /> Cancelar</button>
        <button type="button" onClick={confirmar} disabled={!tam} className="botao flex-1 !py-3"><Check className="size-4" /> Usar foto</button>
      </div>
    </div>
  );
}
