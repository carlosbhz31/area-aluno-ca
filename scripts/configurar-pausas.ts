// Liga o agendador do banco ao site: guarda no cofre do Supabase o endereço de /api/cron/pausas
// e o CRON_SECRET (o mesmo configurado na Vercel). Rodar uma vez, ou ao trocar o segredo.
// Uso: npx tsx --env-file=.env.local scripts/configurar-pausas.ts [endereço do site]

import { clienteAdmin } from "./comum.ts";

const site = (process.argv[2] ?? "https://area-aluno-ca.vercel.app").replace(/\/$/, "");
const segredo = (process.env.CRON_SECRET ?? "").replace(/[﻿\s"']/g, "");
if (!segredo) {
  console.error("Falta CRON_SECRET no .env.local");
  process.exit(1);
}

const { error } = await clienteAdmin().rpc("configurar_disparo_pausas", { endereco: `${site}/api/cron/pausas`, segredo });
if (error) {
  console.error("Não consegui configurar:", error.message);
  process.exit(1);
}
console.log(`Agendador das pausas apontando para ${site}/api/cron/pausas`);
