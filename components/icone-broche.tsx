import {
  Award, CalendarCheck, Camera, ClipboardCheck, Crown, Dumbbell, Flame, Gem, Medal, RefreshCw, Scale, Send, Smartphone, Target, Trophy,
  type LucideIcon,
} from "lucide-react";

const ICONES: Record<string, LucideIcon> = {
  award: Award,
  "calendar-check": CalendarCheck,
  camera: Camera,
  "clipboard-check": ClipboardCheck,
  crown: Crown,
  dumbbell: Dumbbell,
  flame: Flame,
  gem: Gem,
  medal: Medal,
  "refresh-cw": RefreshCw,
  scale: Scale,
  send: Send,
  smartphone: Smartphone,
  target: Target,
  trophy: Trophy,
};

const RARIDADE: Record<string, string> = {
  comum: "bg-borda text-texto",
  raro: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  epico: "bg-marca-suave text-marca",
  lendario: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export function IconeBroche({ icone, raridade, tamanho = "md" }: { icone: string; raridade: string; tamanho?: "sm" | "md" }) {
  const Icone = ICONES[icone] ?? Award;
  const caixa = tamanho === "sm" ? "size-9" : "size-12";
  return (
    <span className={`grid ${caixa} shrink-0 place-items-center rounded-xl ${RARIDADE[raridade] ?? RARIDADE.comum}`}>
      <Icone className={tamanho === "sm" ? "size-4" : "size-6"} />
    </span>
  );
}
