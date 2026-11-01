"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { clienteNavegador } from "@/lib/supabase/navegador";

export function FormularioEntrar({ erroLink }: { erroLink: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [etapa, setEtapa] = useState<"email" | "codigo">("email");
  const [carregando, setCarregando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(erroLink ? "Esse link já foi usado ou expirou. Peça outro." : null);

  async function pedirLink(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setAviso(null);
    const supabase = clienteNavegador();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false, // só entra quem o Carlos cadastrou
        emailRedirectTo: `${window.location.origin}/auth/confirmar`,
      },
    });
    setCarregando(false);
    if (error?.status === 429) {
      setAviso("Muitos pedidos seguidos. Espera um minuto e tenta de novo.");
      return;
    }
    // Mesma resposta para e-mail cadastrado ou não: ninguém descobre quem é aluno.
    setEtapa("codigo");
  }

  async function confirmarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setAviso(null);
    const supabase = clienteNavegador();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: codigo.trim(),
      type: "email",
    });
    if (error) {
      setCarregando(false);
      setAviso("Código não confere ou expirou. Confere no e-mail ou pede outro.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  if (etapa === "codigo") {
    return (
      <form onSubmit={confirmarCodigo} className="space-y-4">
        <div className="rounded-2xl bg-menu-item p-4 text-sm leading-relaxed">
          Se <strong className="text-white">{email}</strong> estiver cadastrado, o link de acesso já está a caminho.
          Toca no link do e-mail ou digita aqui o código que veio junto.
        </div>
        <input
          className="campo text-center text-2xl tracking-[0.4em] !bg-white !text-black"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          placeholder="000000"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
          required
        />
        {aviso && <p className="text-sm text-amber-300">{aviso}</p>}
        <button className="botao w-full" disabled={carregando || codigo.length < 6}>
          {carregando ? <Loader2 className="size-5 animate-spin" /> : "Entrar"}
        </button>
        <button type="button" className="w-full text-sm text-menu-texto/70 underline" onClick={() => setEtapa("email")}>
          Usar outro e-mail
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={pedirLink} className="space-y-4">
      <label className="block">
        <span className="text-sm text-menu-texto/80">Seu e-mail</span>
        <div className="relative mt-2">
          <Mail className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-neutral-400" />
          <input
            type="email"
            className="campo !bg-white !text-black pl-11"
            placeholder="voce@email.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </label>
      {aviso && <p className="text-sm text-amber-300">{aviso}</p>}
      <button className="botao w-full" disabled={carregando}>
        {carregando ? <Loader2 className="size-5 animate-spin" /> : <>Receber link de acesso <ArrowRight className="size-5" /></>}
      </button>
      <p className="text-center text-xs text-menu-texto/60">Sem senha. Use o e-mail que você passou pro Carlos.</p>
    </form>
  );
}
