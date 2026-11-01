// Valores das variáveis de ambiente sem espaços nem caracteres invisíveis (ex.: BOM colado junto).
// Next só embute NEXT_PUBLIC_* no navegador quando o nome aparece literal, por isso cada um é lido por extenso.
const limpar = (v: string | undefined) => (v ?? "").replace(/[﻿​\s"']/g, "");

export const SUPABASE_URL = limpar(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = limpar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
