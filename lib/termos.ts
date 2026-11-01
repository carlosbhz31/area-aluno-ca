// Termos de uso e privacidade. Mudou o texto? Troca a versão: todo aluno aceita de novo.
export const VERSAO_TERMOS = "2026-11-01";

export const TERMOS: { titulo: string; itens: string[] }[] = [
  {
    titulo: "O que é a Área do Aluno",
    itens: [
      "É o espaço da Consultoria Premium Carlos Alberto para acompanhar seu treino: ciclo, acompanhamentos semanais, evolução, plano alimentar (quando houver) e conquistas.",
      "Seu treino continua no app de treino (MFit ou treino.io). Aqui fica o acompanhamento.",
    ],
  },
  {
    titulo: "Quais dados eu guardo",
    itens: [
      "Cadastro: nome, e-mail, telefone, datas e plano da consultoria.",
      "Anamnese: suas respostas sobre rotina, saúde, alimentação e treino.",
      "Acompanhamentos semanais, peso, medidas e as fotos que você mandar.",
      "Endereço e CEP, só para emitir a nota fiscal.",
    ],
  },
  {
    titulo: "Para que eu uso",
    itens: [
      "Montar e ajustar seu treino, acompanhar sua evolução e te responder.",
      "Te mandar avisos do app (quando você ativar) e e-mails sobre a consultoria.",
      "Nunca vendo, nunca empresto e nunca uso seus dados ou fotos em divulgação sem te pedir antes.",
    ],
  },
  {
    titulo: "Quem vê",
    itens: [
      "Você vê só os seus dados. Eu, Carlos, vejo os dados dos meus alunos.",
      "Se você tem acompanhamento com nutricionista, ela vê só seu nome e anexa o plano alimentar. Não vê anamnese, fotos nem acompanhamentos.",
      "Os dados ficam em servidores protegidos (Supabase, no Brasil) e o site roda na Vercel. Fotos e documentos ficam em pastas privadas.",
    ],
  },
  {
    titulo: "Seus direitos",
    itens: [
      "Você pode pedir uma cópia dos seus dados, corrigir o que estiver errado ou pedir para apagar tudo. É só me chamar no WhatsApp.",
      "Quando a consultoria acaba, seu acesso é desligado e os dados ficam guardados para uma possível volta. Se preferir, eu apago.",
      "Se esses termos mudarem, o app te mostra de novo antes de continuar.",
    ],
  },
];
