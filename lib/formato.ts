export function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** 72.8 -> "72,8" */
export function numeroBR(n: number | string | null | undefined, casas = 1): string {
  if (n == null || n === "") return "—";
  return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

export function moedaBR(valor: number | null | undefined): string {
  if (valor == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

/** Link do WhatsApp com mensagem pronta (número com DDD; o 55 do Brasil entra sozinho). */
export function linkWhatsapp(numero: string | null | undefined, mensagem: string): string | null {
  const digitos = (numero ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  const completo = digitos.length <= 11 ? `55${digitos}` : digitos;
  return `https://wa.me/${completo}?text=${encodeURIComponent(mensagem)}`;
}

export function saudacao(agora: Date = new Date()): string {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(agora));
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}
