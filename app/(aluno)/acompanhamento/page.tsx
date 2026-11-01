import { ClipboardList } from "lucide-react";
import { EmBreve } from "@/components/em-breve";

export default function Acompanhamento() {
  return (
    <EmBreve titulo="Acompanhamento" icone={ClipboardList}>
      Aqui você vai me mandar como foi a semana e ler minha resposta. Por enquanto, segue pelo WhatsApp como sempre.
    </EmBreve>
  );
}
