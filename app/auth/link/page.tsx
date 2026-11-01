"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { clienteNavegador } from "@/lib/supabase/navegador";

// Destino do link mágico. Aceita os três formatos que o Supabase pode mandar:
// tokens no "#" (padrão), token_hash (modelo próprio) ou code.
export default function LinkDeAcesso() {
  const router = useRouter();
  const [erro, setErro] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = clienteNavegador();
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const busca = new URLSearchParams(window.location.search);
      let ok = false;

      // O link novo sempre manda: troca qualquer sessão antiga guardada neste navegador.
      if (hash.get("access_token") && hash.get("refresh_token")) {
        const { error } = await supabase.auth.setSession({ access_token: hash.get("access_token")!, refresh_token: hash.get("refresh_token")! });
        if (error) console.error("login:", error.message);
        ok = !error;
        if (!ok) ok = !!(await supabase.auth.getSession()).data.session; // o cliente já pode ter lido o "#" sozinho
      } else if (busca.get("token_hash")) {
        ok = !(await supabase.auth.verifyOtp({ token_hash: busca.get("token_hash")!, type: (busca.get("type") ?? "email") as EmailOtpType })).error;
      } else if (busca.get("code")) {
        ok = !(await supabase.auth.exchangeCodeForSession(busca.get("code")!)).error;
      }

      if (ok) {
        router.replace("/");
        router.refresh();
      } else {
        setErro(true);
      }
    })();
  }, [router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-menu px-6 text-center text-menu-texto">
      {erro ? (
        <div className="max-w-xs space-y-4">
          <p className="text-lg font-semibold text-white">Esse link já foi usado ou expirou.</p>
          <a href="/entrar" className="botao w-full">Pedir outro link</a>
        </div>
      ) : (
        <p className="flex items-center gap-2"><Loader2 className="size-5 animate-spin" /> Entrando…</p>
      )}
    </main>
  );
}
