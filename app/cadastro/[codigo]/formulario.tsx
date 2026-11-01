"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { enviarCadastro } from "../acoes";
import { FormularioEntrar } from "@/app/entrar/formulario";

export function FormCadastroAluno({ codigo }: { codigo: string }) {
  const [estado, enviar, pendente] = useActionState(enviarCadastro.bind(null, codigo), undefined);

  // Cadastro feito: já mostra a entrada com o e-mail preenchido
  if (estado?.email) {
    return (
      <div className="space-y-6">
        <p className="rounded-xl bg-white/10 p-4 text-sm text-white">
          <strong>Cadastro feito!</strong> Agora é só entrar: toca no botão, abre o e-mail que chegar e pronto.
        </p>
        <FormularioEntrar erroLink={false} emailInicial={estado.email} />
      </div>
    );
  }

  const campo = "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-marca focus:outline-none";
  return (
    <form action={enviar} className="space-y-4">
      <p className="text-sm text-white/80">Preenche seus dados para eu liberar seu acesso. Leva 1 minuto.</p>
      <label className="block">
        <span className="text-sm font-semibold text-white">Nome completo</span>
        <input name="nome" required autoComplete="name" className={`${campo} mt-1`} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-white">E-mail</span>
        <input name="email" type="email" required autoComplete="email" inputMode="email" className={`${campo} mt-1`} />
        <span className="mt-1 block text-xs text-white/60">É com ele que você entra no app.</span>
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-white">WhatsApp com DDD</span>
        <input name="telefone" required autoComplete="tel" inputMode="tel" placeholder="(31) 99999-9999" className={`${campo} mt-1`} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-white">Data de nascimento</span>
        <input name="nascimento" type="date" className={`${campo} mt-1 [color-scheme:dark]`} />
      </label>
      {estado?.erro && <p className="text-sm font-semibold text-red-300">{estado.erro}</p>}
      <button className="botao w-full !py-3.5" disabled={pendente}>
        {pendente ? <Loader2 className="size-4 animate-spin" /> : <>Cadastrar <ArrowRight className="size-4" /></>}
      </button>
    </form>
  );
}
