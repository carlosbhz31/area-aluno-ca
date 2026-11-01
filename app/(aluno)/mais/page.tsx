import { FileText, LogOut, Salad, Smartphone, ClipboardPen, ChevronRight } from "lucide-react";

const ITENS = [
  { icone: FileText, titulo: "Meu plano", texto: "Ciclo atual, orientações da semana e contrato." },
  { icone: Salad, titulo: "Nutrição", texto: "Seu plano alimentar em PDF." },
  { icone: ClipboardPen, titulo: "Anamnese", texto: "Questionário inicial e de realinhamento." },
];

export default function Mais() {
  return (
    <div className="mx-auto max-w-xl space-y-4 pt-2">
      <h1 className="text-2xl font-bold">Mais</h1>

      <ul className="cartao divide-y divide-borda">
        {ITENS.map(({ icone: Icone, titulo, texto }) => (
          <li key={titulo} className="flex items-center gap-3 p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-marca-suave text-marca"><Icone className="size-5" /></span>
            <div className="flex-1">
              <p className="font-semibold">{titulo}</p>
              <p className="text-sm text-texto-suave">{texto}</p>
            </div>
            <span className="text-xs font-semibold text-texto-suave">em breve</span>
          </li>
        ))}
      </ul>

      <section className="cartao p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Smartphone className="size-5 text-marca" /> Coloca o app na tela inicial</h2>
        <div className="mt-3 space-y-3 text-sm text-texto-suave">
          <p><strong className="text-texto">iPhone (Safari):</strong> toca em Compartilhar <ChevronRight className="inline size-3" /> Adicionar à Tela de Início.</p>
          <p><strong className="text-texto">Android (Chrome):</strong> toca nos três pontinhos <ChevronRight className="inline size-3" /> Instalar app.</p>
        </div>
      </section>

      <form action="/auth/sair" method="post">
        <button className="botao-secundario w-full"><LogOut className="size-4" /> Sair</button>
      </form>
    </div>
  );
}
