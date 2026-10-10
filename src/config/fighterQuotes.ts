/*
 * What each fighter says: a line on the VS screen and one when it wins (victory screen). Plain
 * data keyed by fighter id, like the story endings: a fighter without lines simply says
 * nothing. Light, friendly trash talk about each partner's company and special; edit freely.
 */

export interface FighterQuotes {
  /** Before the fight (VS screen). */
  versus: readonly string[];
  /** After winning (victory screen). */
  victory: readonly string[];
}

export const FIGHTER_QUOTES: Readonly<Record<string, FighterQuotes>> = {
  augusto: {
    versus: ['Bora resolver isso no 24zap?', 'Meu CRM já previu sua derrota.'],
    victory: ['Lead qualificado, negócio fechado!', 'Mais um card movido para GANHO.'],
  },
  filipe: {
    versus: ['Meu agente de IA já estudou todos os seus golpes.', 'Direto de Portugal, ó pá!'],
    victory: [
      'O Mindhub avisou: 100% de chance de vitória.',
      'Atendimento automático: você perdeu.',
    ],
  },
  'joao-guiotti': {
    versus: ['Vou codar sua derrota no vibe.', 'Prompt pronto: "derrotar oponente".'],
    victory: ['Deploy em produção, sem nenhum bug!', 'Vibecode venceu mais uma.'],
  },
  romualdo: {
    versus: [
      'Já criei um agente só para te derrotar.',
      'Na CRMThink a gente pensa antes de bater.',
    ],
    victory: ['Automatizei essa vitória.', 'Meu GPT já sabia o resultado.'],
  },
  'isaque-ferreira': {
    versus: ['Vim da Espanha só para isso, hein!', 'Prepara que hoje tem paella de pancada.'],
    victory: ['¡Olé! Mais uma para a conta.', '¡Hasta la vista, parceiro!'],
  },
  aislan: {
    versus: [
      'Seu processo vai fluir... direto para o chão.',
      'Na ZOPU a gente otimiza até a luta.',
    ],
    victory: ['Fluxo otimizado com sucesso.', 'FLUIDZ: sem gargalo, sem chance.'],
  },
  romulo: {
    versus: ['De Castelo Branco para o mundo!', 'Atravessei o oceano só para essa luta.'],
    victory: ['Até em Portugal o funil converte.', 'Mensagem enviada, vitória entregue.'],
  },
  'gabriel-mattozo': {
    versus: ['Meu workflow já está rodando.', 'Gatilho disparado: hora da luta!'],
    victory: ['Executado com sucesso!', 'Mais uma automação no ar.'],
  },
  gabriele: {
    versus: ['Cuidado que eu chamo o 190, hein!', 'Aqui é Rio de Janeiro, meu amor.'],
    victory: ['Inovar é isso: vencer sem suar.', 'Polícia chegou, caso encerrado!'],
  },
  dmitry: {
    versus: ['Bem-vindo à sede da Bitrix24.', 'Vamos ver se você é parceiro gold.'],
    victory: ['Seu plano foi rebaixado para o gratuito.', 'Volte quando tiver mais licenças.'],
  },
};

/** One of the fighter's lines of this kind (random by default), or undefined when it has none. */
export function pickQuote(
  fighterId: string,
  kind: keyof FighterQuotes,
  random: () => number = Math.random,
): string | undefined {
  const lines = FIGHTER_QUOTES[fighterId]?.[kind];
  if (!lines || lines.length === 0) return undefined;
  return lines[Math.floor(random() * lines.length) % lines.length];
}
