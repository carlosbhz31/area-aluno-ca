"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2, Smartphone } from "lucide-react";
import { marcarAppInstalado, salvarInscricaoPush } from "@/app/(aluno)/acoes";

const CHAVE_VAPID = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").replace(/[﻿\s"']/g, "");

function chaveParaBytes(base64: string) {
  const preenchido = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(preenchido), (c) => c.charCodeAt(0));
}

type Estado = "carregando" | "sem_suporte" | "instalar_iphone" | "desligado" | "bloqueado" | "ligado";

/** Cartão "Ativar avisos". No iPhone só funciona com o app na tela inicial (iOS 16.4+). */
export function AtivarAvisos({ compacto = false }: { compacto?: boolean }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (instalado) {
      try {
        if (!localStorage.getItem("ca-app-instalado")) {
          localStorage.setItem("ca-app-instalado", "1");
          marcarAppInstalado();
        }
      } catch {
        marcarAppInstalado();
      }
    }
    const iphone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setEstado(iphone && !instalado ? "instalar_iphone" : "sem_suporte");
      return;
    }
    if (Notification.permission === "denied") return setEstado("bloqueado");
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const atual = await reg.pushManager.getSubscription();
      setEstado(atual && Notification.permission === "granted" ? "ligado" : "desligado");
    }).catch(() => setEstado("sem_suporte"));
  }, []);

  async function ativar() {
    setOcupado(true);
    setErro(null);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "bloqueado" : "desligado");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const inscricao = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(CHAVE_VAPID) }));
      const r = await salvarInscricaoPush(JSON.parse(JSON.stringify(inscricao)), navigator.userAgent);
      if (r?.erro) setErro(r.erro);
      else setEstado("ligado");
    } catch {
      setErro("Não deu certo neste aparelho. Tenta de novo pelo app instalado na tela inicial.");
    } finally {
      setOcupado(false);
    }
  }

  if (estado === "carregando" || (compacto && (estado === "ligado" || estado === "sem_suporte" || estado === "bloqueado"))) return null;

  if (estado === "instalar_iphone") {
    return (
      <section className="cartao flex items-start gap-3 p-4 text-sm">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-marca" />
        <p>
          <strong>Quer receber meus avisos?</strong> No iPhone, primeiro coloca o app na tela inicial: Compartilhar → Adicionar à Tela de Início. Depois abre por lá e ativa aqui.
        </p>
      </section>
    );
  }

  return (
    <section className="cartao flex items-start gap-3 p-4 text-sm">
      {estado === "ligado" ? <BellRing className="mt-0.5 size-5 shrink-0 text-ok" /> : <Bell className="mt-0.5 size-5 shrink-0 text-marca" />}
      <div className="flex-1">
        {estado === "ligado" && <p><strong>Avisos ligados neste aparelho.</strong> Te aviso quando eu responder, no dia do acompanhamento e nas conquistas.</p>}
        {estado === "bloqueado" && <p><strong>Os avisos estão bloqueados.</strong> Libera nas configurações do navegador ou do celular para este site.</p>}
        {estado === "sem_suporte" && <p>Este navegador não recebe avisos. No celular, abre pelo app instalado na tela inicial.</p>}
        {estado === "desligado" && (
          <>
            <p><strong>Ativa os avisos.</strong> Poucos e úteis: resposta do acompanhamento, dia do check-in e conquistas.</p>
            <button onClick={ativar} disabled={ocupado} className="botao mt-3 !py-2 text-sm">
              {ocupado ? <Loader2 className="size-4 animate-spin" /> : <><Bell className="size-4" /> Ativar avisos</>}
            </button>
          </>
        )}
        {erro && <p className="mt-2 text-perigo">{erro}</p>}
      </div>
    </section>
  );
}
