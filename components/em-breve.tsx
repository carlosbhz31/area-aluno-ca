import type { LucideIcon } from "lucide-react";
import { Vazio } from "./ui";

export function EmBreve({ titulo, icone, children }: { titulo: string; icone: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl space-y-4 pt-2">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <div className="cartao p-5">
        <Vazio icone={icone} titulo="Chega na próxima atualização">
          {children}
        </Vazio>
      </div>
    </div>
  );
}
