import "server-only";
import webpush from "web-push";
import nodemailer from "nodemailer";
import { clienteAdmin } from "./supabase/servidor";

const limpar = (v?: string) => (v ?? "").replace(/[﻿\s"']/g, "");
const SITE = "https://area-aluno-ca.vercel.app";

let vapidPronto = false;
function prepararVapid() {
  if (vapidPronto) return true;
  const pub = limpar(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const priv = limpar(process.env.VAPID_PRIVATE_KEY);
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:carlosbhz31@gmail.com", pub, priv);
  vapidPronto = true;
  return true;
}

/** Hora atual em Belo Horizonte (0-23). */
function horaBH(agora = new Date()) {
  return Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(agora)) % 24;
}

export function emSilencio(inicio: number, fim: number, hora = horaBH()) {
  if (inicio === fim) return false;
  return inicio > fim ? hora >= inicio || hora < fim : hora >= inicio && hora < fim;
}

export type Aviso = {
  userId: string;
  tipo: string;
  titulo: string;
  corpo: string;
  url?: string;
  referencia?: string; // mesmo tipo + referência = não manda de novo
  silencio?: { inicio: number; fim: number } | null;
};

/** Registra o aviso e manda push para os aparelhos da pessoa (fora do horário silencioso). */
export async function avisar(a: Aviso): Promise<"enviado" | "repetido" | "silencio" | "sem_aparelho"> {
  const admin = clienteAdmin();
  const { data: noti, error } = await admin
    .from("notificacoes")
    .insert({ destinatario: a.userId, tipo: a.tipo, referencia: a.referencia ?? null, dados: { titulo: a.titulo, corpo: a.corpo, url: a.url ?? "/" } })
    .select("id")
    .single();
  if (error) return "repetido";
  if (a.silencio && emSilencio(a.silencio.inicio, a.silencio.fim)) return "silencio";

  const algum = await enviarPush(a.userId, { titulo: a.titulo, corpo: a.corpo, url: a.url ?? "/" }, { TTL: 60 * 60 * 24 });
  if (algum) await admin.from("notificacoes").update({ enviada_em: new Date().toISOString() }).eq("id", noti.id);
  return algum ? "enviado" : "sem_aparelho";
}

export type CargaPush = { titulo: string; corpo: string; url: string; tipo?: string };

/** Manda o push para todos os aparelhos da pessoa. true se chegou em pelo menos um. */
export async function enviarPush(userId: string, carga: CargaPush, opcoes: webpush.RequestOptions) {
  const admin = clienteAdmin();
  const { data: inscricoes } = await admin.from("inscricoes_push").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  if (!inscricoes?.length || !prepararVapid()) return false;

  const texto = JSON.stringify(carga);
  let algum = false;
  await Promise.all(
    inscricoes.map(async (i) => {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, texto, opcoes);
        algum = true;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await admin.from("inscricoes_push").delete().eq("id", i.id); // aparelho desinstalou
        else console.error("push:", status, (e as Error).message);
      }
    }),
  );
  return algum;
}

/** Avisa o aluno pelo id do cadastro (busca login e horário silencioso). */
export async function avisarAluno(alunoId: string, aviso: Omit<Aviso, "userId" | "silencio">) {
  const { data: aluno } = await clienteAdmin().from("alunos").select("user_id, situacao, silencio_inicio, silencio_fim").eq("id", alunoId).maybeSingle();
  if (!aluno?.user_id || aluno.situacao === "inativo") return "sem_aparelho";
  return avisar({ ...aviso, userId: aluno.user_id, silencio: { inicio: aluno.silencio_inicio, fim: aluno.silencio_fim } });
}

// E-mail (Gmail da consultoria). Sem GMAIL_APP_PASSWORD configurado, só não envia.
let transporte: ReturnType<typeof nodemailer.createTransport> | null = null;
export function emailConfigurado() {
  return !!limpar(process.env.GMAIL_APP_PASSWORD);
}
export async function enviarEmail(para: string, assunto: string, html: string) {
  if (!emailConfigurado()) return false;
  transporte ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: limpar(process.env.GMAIL_USER) || "carlosbhz31@gmail.com", pass: limpar(process.env.GMAIL_APP_PASSWORD) },
  });
  await transporte.sendMail({ from: `"Consultoria Premium CA" <${limpar(process.env.GMAIL_USER) || "carlosbhz31@gmail.com"}>`, to: para, subject: assunto, html });
  return true;
}

/** Moldura simples de e-mail com a cara da CA. */
export function htmlEmail(titulo: string, corpo: string, botao?: { texto: string; url: string }) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#121113">
  <p style="font-size:12px;letter-spacing:3px;color:#5f5c63;margin:0">CONSULTORIA PREMIUM CA</p>
  <h2 style="margin:8px 0 16px">${titulo}</h2>
  ${corpo}
  ${botao ? `<p style="margin:24px 0"><a href="${botao.url.startsWith("http") ? botao.url : SITE + botao.url}" style="background:#4423ed;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:bold">${botao.texto}</a></p>` : ""}
  <p style="font-size:12px;color:#5f5c63">Área do Aluno CA · ${SITE.replace("https://", "")}</p></div>`;
}
