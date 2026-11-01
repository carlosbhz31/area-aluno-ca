// Modelo da anamnese (o mesmo questionário do Google Forms "Anamnese - Team CA").
// Usado pela tela do aluno, pela ficha do professor e pela validação no servidor.

export type TipoPergunta = "texto" | "longo" | "numero" | "data" | "escala" | "opcao" | "multipla" | "fotos";

export type Pergunta = {
  id: string;
  texto: string;
  tipo: TipoPergunta;
  opcoes?: string[];
  ajuda?: string;
  obrigatoria?: boolean;
  /** Só aparece quando outra pergunta da mesma etapa tem este valor. */
  se?: { pergunta: string; valor: string };
  max?: number; // limite de escolhas (múltipla) ou de fotos
  placeholder?: string;
  imagem?: string; // figura de apoio (em /public)
};

export type Etapa = { id: string; titulo: string; texto: string; perguntas: Pergunta[]; soInicial?: boolean };

const SIM_NAO = ["Sim", "Não"];

export const ETAPAS: Etapa[] = [
  {
    id: "dados",
    titulo: "Seus dados",
    texto: "O endereço é só para a nota fiscal. Fica com o Carlos.",
    soInicial: true,
    perguntas: [
      { id: "nascimento", texto: "Data de nascimento", tipo: "data", obrigatoria: true },
      { id: "peso", texto: "Peso (kg)", tipo: "numero", obrigatoria: true, placeholder: "Ex.: 72,4" },
      { id: "altura", texto: "Altura (cm)", tipo: "numero", obrigatoria: true, placeholder: "Ex.: 175" },
      { id: "endereco", texto: "Endereço completo no Brasil", tipo: "texto", obrigatoria: true, placeholder: "Rua, número, complemento, cidade, estado" },
      { id: "cep", texto: "CEP", tipo: "texto", obrigatoria: true, placeholder: "00000-000" },
    ],
  },
  {
    id: "postura",
    titulo: "Postura e dores",
    texto: "Sem certo ou errado. É só para eu montar o treino do seu jeito.",
    perguntas: [
      { id: "postura_nota", texto: "De 1 a 10, como você considera a sua postura?", tipo: "escala", obrigatoria: true },
      {
        id: "postura_tipo",
        texto: "Qual dessas parece mais com a sua postura de lado?",
        tipo: "opcao",
        obrigatoria: true,
        imagem: "/anamnese/postura.png",
        opcoes: [
          "A · Alinhada",
          "B · Costas arredondadas e lombar bem curvada",
          "C · Costas retas, quase sem curva",
          "D · Quadril para frente e ombros para trás",
          "Não sei dizer",
        ],
      },
      { id: "dor", texto: "Sente dor em alguma região?", tipo: "multipla", obrigatoria: true, opcoes: ["Cervical (pescoço)", "Torácica (meio das costas)", "Lombar", "Sacral (fim da coluna)", "Ombro", "Joelho", "Não sinto dor"] },
      { id: "dor_outra", texto: "Outra dor ou detalhe que eu deva saber?", tipo: "texto" },
    ],
  },
  {
    id: "rotina",
    titulo: "Rotina",
    texto: "Trabalho, sono e hábitos mudam muito o que dá para fazer.",
    perguntas: [
      { id: "profissao", texto: "Qual sua profissão?", tipo: "texto", obrigatoria: true },
      { id: "horas_trabalho", texto: "Quantas horas trabalha por dia?", tipo: "numero", obrigatoria: true },
      { id: "trabalho_posicao", texto: "No trabalho você fica mais tempo:", tipo: "opcao", obrigatoria: true, opcoes: ["Em pé", "Sentado", "Alternando"] },
      { id: "investimento", texto: "Consegue prever esse investimento no seu orçamento nos próximos protocolos?", tipo: "opcao", obrigatoria: true, opcoes: SIM_NAO },
      { id: "ansiedade", texto: "De 1 a 10, seu nível de ansiedade", tipo: "escala", obrigatoria: true },
      { id: "sono_qualidade", texto: "De 1 a 10, sua qualidade de sono", tipo: "escala", obrigatoria: true },
      { id: "sono_horas", texto: "Quantas horas você costuma dormir?", tipo: "numero", obrigatoria: true },
      { id: "consumo", texto: "Costuma consumir:", tipo: "multipla", obrigatoria: true, opcoes: ["Bebida alcoólica", "Cigarro", "Drogas", "Nada disso"] },
    ],
  },
  {
    id: "saude",
    titulo: "Saúde",
    texto: "Fica só entre a gente.",
    perguntas: [
      {
        id: "medicacao",
        texto: "Toma alguma medicação hoje?",
        ajuda: "Reposição hormonal, anticoncepcional, antidepressivo, ansiolítico, pseudoanfetaminas…",
        tipo: "opcao",
        obrigatoria: true,
        opcoes: SIM_NAO,
      },
      { id: "medicacao_quais", texto: "Quais e há quanto tempo?", tipo: "longo", obrigatoria: true, se: { pergunta: "medicacao", valor: "Sim" } },
      { id: "familia", texto: "Tem familiares com hipertensão, problemas cardíacos, diabetes, respiratórios ou câncer?", tipo: "texto", obrigatoria: true },
      { id: "ossos", texto: "Tem ou já teve problemas ósseos ou articulares?", tipo: "opcao", obrigatoria: true, opcoes: SIM_NAO },
      { id: "ossos_quais", texto: "Quais?", tipo: "longo", obrigatoria: true, se: { pergunta: "ossos", valor: "Sim" } },
    ],
  },
  {
    id: "nutricao",
    titulo: "Alimentação",
    texto: "Para eu alinhar o treino com o que você come.",
    perguntas: [
      { id: "dieta", texto: "Segue alguma dieta com orientação de profissional?", tipo: "opcao", obrigatoria: true, opcoes: SIM_NAO },
      { id: "dieta_qual", texto: "Com quem e como é?", tipo: "texto", se: { pergunta: "dieta", valor: "Sim" } },
      { id: "adesao", texto: "De 1 a 10, sua adesão ao plano alimentar", tipo: "escala", obrigatoria: true },
      { id: "suplementos", texto: "Usa algum suplemento? Quais?", tipo: "texto", obrigatoria: true, placeholder: "Se não usa, escreve “nenhum”" },
      { id: "agua", texto: "Quantos litros de água você bebe por dia?", tipo: "numero", obrigatoria: true },
    ],
  },
  {
    id: "academia",
    titulo: "Onde você treina",
    texto: "Monto os exercícios com o que você tem à mão.",
    perguntas: [
      { id: "academia", texto: "Nome da academia e cidade", tipo: "texto", obrigatoria: true },
      { id: "academia_link", texto: "Instagram ou site da academia", tipo: "texto", placeholder: "Cola o link" },
      { id: "pesos_livres", texto: "Tem área de pesos livres e barras para montar com anilhas?", tipo: "opcao", obrigatoria: true, opcoes: SIM_NAO },
      { id: "bancos_polias", texto: "Os bancos ficam perto das polias, caso precise puxar um?", tipo: "opcao", obrigatoria: true, opcoes: SIM_NAO },
      { id: "equipamentos_casa", texto: "Se for treinar em casa, descreve todos os equipamentos que você tem", tipo: "longo" },
      { id: "consultoria_antes", texto: "Já fez alguma consultoria?", tipo: "opcao", obrigatoria: true, opcoes: SIM_NAO },
      { id: "consultoria_experiencia", texto: "Como foi a experiência?", tipo: "longo", se: { pergunta: "consultoria_antes", valor: "Sim" } },
    ],
  },
  {
    id: "objetivo",
    titulo: "Objetivo e preferências",
    texto: "Aqui a gente define o rumo do treino.",
    perguntas: [
      {
        id: "objetivo",
        texto: "Qual seu principal objetivo?",
        tipo: "opcao",
        obrigatoria: true,
        opcoes: ["Hipertrofia", "Diminuir gordura corporal", "Aumento de resistência", "Qualidade de vida", "Fortalecimento para uma modalidade"],
      },
      { id: "objetivo_detalhe", texto: "Quer detalhar? (modalidade, meta, prazo)", tipo: "texto" },
      { id: "cardio_separado", texto: "Consegue fazer cardio em outro horário? Ex.: cardio de manhã e treino à noite", tipo: "opcao", obrigatoria: true, opcoes: SIM_NAO },
      { id: "dias", texto: "Quais dias você tem para treinar?", tipo: "multipla", obrigatoria: true, opcoes: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] },
      { id: "tempo_treino", texto: "Quanto tempo tem para cada treino?", tipo: "texto", obrigatoria: true, placeholder: "Ex.: 1h15" },
      { id: "periodo", texto: "Em qual período você treina?", tipo: "multipla", obrigatoria: true, opcoes: ["Manhã", "Tarde", "Noite"] },
      {
        id: "cardio_tipo",
        texto: "Em qual cardio você tem mais adesão?",
        ajuda: "HIIT: curto (15 a 20 min), com picos de intensidade. Contínuo: ritmo constante, um pouco mais longo.",
        tipo: "opcao",
        obrigatoria: true,
        opcoes: ["HIIT", "Contínuo"],
      },
      { id: "cardio_favorito", texto: "Qual cardio você mais gosta e faz com facilidade?", tipo: "texto", obrigatoria: true, placeholder: "Esteira, bike, elíptico, escada, dança…" },
      { id: "grupos", texto: "Quais grupos musculares quer melhorar? (até 3)", tipo: "multipla", obrigatoria: true, max: 3, opcoes: ["Peitoral", "Costas", "Braços", "Ombros", "Quadríceps", "Posterior", "Glúteos", "Panturrilha", "Abdômen"] },
      { id: "cargas", texto: "Você costuma se desafiar nas cargas? Me conta sua percepção", tipo: "longo", obrigatoria: true },
      { id: "exercicio_mais", texto: "Qual exercício você MAIS gosta? Por quê?", tipo: "longo", obrigatoria: true },
      { id: "exercicio_menos", texto: "Qual exercício você MENOS gosta? Por quê?", tipo: "longo", obrigatoria: true },
      { id: "mini_bands", texto: "Tem mini bands? (elástico de perna para ativar glúteo)", ajuda: "Vamos precisar. Te mando o link no WhatsApp.", tipo: "opcao", obrigatoria: true, opcoes: SIM_NAO },
    ],
  },
  {
    id: "historico",
    titulo: "Seu histórico",
    texto: "Última parte. Quanto mais você contar, melhor fica o treino.",
    perguntas: [
      { id: "historico", texto: "Me conta sua experiência na musculação", tipo: "longo", obrigatoria: true },
      { id: "treino_antigo_fotos", texto: "Prints ou fotos do seu treino antigo", tipo: "fotos", max: 4 },
      { id: "treino_antigo", texto: "Sem print? Descreve como era a divisão", tipo: "longo" },
      { id: "inspiracao", texto: "Uma inspiração: atleta ou físico que você admira", tipo: "fotos", max: 2 },
      { id: "observacao", texto: "Alguma coisa IMPORTANTE sobre você que eu não perguntei? Sobre qualquer área da sua vida", tipo: "longo", obrigatoria: true },
    ],
  },
];

export type TipoAnamnese = "inicial" | "realinhamento";
export type Valor = string | string[];
export type RespostasEtapa = Record<string, Valor>;
export type RespostasAnamnese = Record<string, RespostasEtapa>;

export const etapasDo = (tipo: TipoAnamnese) => ETAPAS.filter((e) => tipo === "inicial" || !e.soInicial);

export const visivel = (p: Pergunta, r: RespostasEtapa) => !p.se || r[p.se.pergunta] === p.se.valor;

const vazio = (v: Valor | undefined) => v == null || (Array.isArray(v) ? v.length === 0 : v.trim() === "");

/** Limpa o que veio do formulário: só perguntas do modelo, tamanhos limitados, opções válidas. */
export function limparEtapa(etapa: Etapa, bruto: Record<string, unknown>, alunoId: string): RespostasEtapa {
  const r: RespostasEtapa = {};
  for (const p of etapa.perguntas) {
    const v = bruto[p.id];
    if (p.tipo === "multipla" || p.tipo === "fotos") {
      let lista = (Array.isArray(v) ? v : []).map((x) => String(x).trim()).filter(Boolean);
      if (p.tipo === "multipla") lista = lista.filter((x) => p.opcoes!.includes(x));
      else lista = lista.filter((x) => x.startsWith(`${alunoId}/anamnese/`) && !x.includes(".."));
      if (p.max) lista = lista.slice(0, p.max);
      if (lista.length) r[p.id] = [...new Set(lista)];
    } else {
      const s = String(v ?? "").trim().slice(0, p.tipo === "longo" ? 3000 : 300);
      if (!s) continue;
      if (p.tipo === "opcao" && !p.opcoes!.includes(s)) continue;
      if (p.tipo === "escala" && !/^(10|[1-9])$/.test(s)) continue;
      if (p.tipo === "data" && !/^\d{4}-\d{2}-\d{2}$/.test(s)) continue;
      if (p.tipo === "numero" && !Number.isFinite(Number(s.replace(",", ".")))) continue;
      r[p.id] = s;
    }
  }
  // respostas de perguntas escondidas não ficam salvas
  for (const p of etapa.perguntas) if (!visivel(p, r)) delete r[p.id];
  return r;
}

/** Perguntas obrigatórias que faltam numa etapa. */
export function faltando(etapa: Etapa, r: RespostasEtapa = {}) {
  return etapa.perguntas.filter((p) => p.obrigatoria && visivel(p, r) && vazio(r[p.id]));
}

/** Primeira etapa incompleta (ou -1 se tudo pronto). */
export function etapaPendente(tipo: TipoAnamnese, respostas: RespostasAnamnese) {
  return etapasDo(tipo).findIndex((e) => faltando(e, respostas[e.id]).length > 0);
}

/** Caminhos de todas as fotos da anamnese (para gerar os links temporários). */
export function fotosDaAnamnese(respostas: RespostasAnamnese) {
  return ETAPAS.flatMap((e) => e.perguntas.filter((p) => p.tipo === "fotos").flatMap((p) => {
    const v = respostas[e.id]?.[p.id];
    return Array.isArray(v) ? v : [];
  }));
}

/** Texto para exibir uma resposta (fotos ficam de fora). */
export function textoResposta(p: Pergunta, v: Valor | undefined) {
  if (vazio(v)) return null;
  if (p.tipo === "data" && typeof v === "string") return v.split("-").reverse().join("/");
  return Array.isArray(v) ? v.join(", ") : v!;
}
