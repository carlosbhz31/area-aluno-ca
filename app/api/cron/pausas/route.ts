import { NextResponse, type NextRequest } from "next/server";
import { clienteAdmin } from "@/lib/supabase/servidor";
import { enviarPush } from "@/lib/notificar";

// Chamada pelo banco (agendador a cada 2 s) quando alguma pausa de treino venceu: manda o push.
// O aviso ignora o horário silencioso: quem está treinando quer saber que a pausa acabou.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VELHA_MS = 3 * 60_000; // pausa que venceu há mais de 3 min (servidor fora do ar): não avisa mais

export async function POST(request: NextRequest) {
  const segredo = (process.env.CRON_SECRET ?? "").replace(/[﻿\s"']/g, "");
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const admin = clienteAdmin();
  const { data: pausas, error } = await admin.rpc("reservar_pausas");
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const agora = Date.now();
  const resultados = await Promise.all(
    (pausas ?? []).map(async (p: { id: string; user_id: string; termina_em: string; titulo: string; corpo: string; url: string }) => {
      const atraso = agora - Date.parse(p.termina_em);
      let resultado: string;
      if (atraso > VELHA_MS) resultado = "velha";
      else {
        const chegou = await enviarPush(
          p.user_id,
          { titulo: p.titulo, corpo: p.corpo, url: p.url, tipo: "pausa" },
          { TTL: 90, urgency: "high", topic: "pausa" },
        );
        resultado = chegou ? "enviado" : "sem_aparelho";
      }
      await admin.from("pausas").update({ resultado: `${resultado} (${Math.round(atraso / 100) / 10}s)` }).eq("id", p.id);
      return resultado;
    }),
  );
  return NextResponse.json({ pausas: resultados.length, resultados });
}
