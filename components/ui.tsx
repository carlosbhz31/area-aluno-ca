import type { LucideIcon } from "lucide-react";

export function Barra({ valor, className = "", cor = "bg-marca" }: { valor: number; className?: string; cor?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(valor * 100)));
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-borda ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${cor} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Cartao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`cartao p-5 ${className}`}>{children}</section>;
}

export function TituloCartao({ icone: Icone, children, acao }: { icone?: LucideIcon; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-texto-suave">
        {Icone && <Icone className="size-4" />}
        {children}
      </h2>
      {acao}
    </div>
  );
}

type Tom = "neutro" | "marca" | "ok" | "alerta" | "perigo";
const TONS: Record<Tom, string> = {
  neutro: "bg-borda/60 text-texto-suave",
  marca: "bg-marca-suave text-marca",
  ok: "bg-ok-suave text-ok",
  alerta: "bg-alerta-suave text-alerta",
  perigo: "bg-perigo-suave text-perigo",
};

export function Selo({ tom = "neutro", children }: { tom?: Tom; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONS[tom]}`}>{children}</span>;
}

export function Vazio({ icone: Icone, titulo, children }: { icone: LucideIcon; titulo: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-borda px-4 py-8 text-center">
      <div className="mb-3 grid size-11 place-items-center rounded-full bg-marca-suave text-marca">
        <Icone className="size-5" />
      </div>
      <p className="font-semibold">{titulo}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-texto-suave">{children}</div>}
    </div>
  );
}
