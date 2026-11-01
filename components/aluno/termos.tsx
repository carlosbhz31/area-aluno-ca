import { TERMOS } from "@/lib/termos";

export function TextoTermos() {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      {TERMOS.map((s) => (
        <section key={s.titulo}>
          <h2 className="font-bold">{s.titulo}</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-texto-suave">
            {s.itens.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
