import { LineChart } from "lucide-react";
import { EmBreve } from "@/components/em-breve";

export default function Evolucao() {
  return (
    <EmBreve titulo="Evolução" icone={LineChart}>
      Peso, medidas e fotos por data, com o antes e depois. Só você e o Carlos veem.
    </EmBreve>
  );
}
