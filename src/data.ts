/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Discipline, Reminder, StudyBlock, MockTest, ActivityLog, StreakDay, ExerciseLog } from './types';

export const INITIAL_DISCIPLINES: Discipline[] = [
  {
    id: 'd1',
    name: 'Direito Administrativo',
    topicsTotal: 9,
    topicsDone: 0,
    topics: [
      { id: 't1_1', name: 'Estado, Governo e Administração Pública', completed: false },
      { id: 't1_2', name: 'Atos Administrativos', completed: false },
      { id: 't1_3', name: 'Agentes Públicos', completed: false },
      { id: 't1_4', name: 'Licitações e Contratos Públicos (Lei 14.133)', completed: false },
      { id: 't1_5', name: 'Processo Administrativo (Lei 9.784)', completed: false },
      { id: 't1_6', name: 'Improbidade Administrativa (Lei 8.429)', completed: false },
      { id: 't1_7', name: 'Bens Públicos', completed: false },
      { id: 't1_8', name: 'Responsabilidade Civil do Estado', completed: false },
      { id: 't1_9', name: 'Controle da Administração Pública', completed: false }
    ],
    timeSpentMin: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    icon: 'gavel',
    colorClass: 'emerald'
  },
  {
    id: 'd2',
    name: 'Contabilidade Geral',
    topicsTotal: 7,
    topicsDone: 0,
    topics: [
      { id: 't2_1', name: 'Noções Gerais, Campo de Atuação e Objetivo', completed: false },
      { id: 't2_2', name: 'Contas e Plano de Contas', completed: false },
      { id: 't2_3', name: 'Fatos Contábeis e Lançamentos', completed: false },
      { id: 't2_4', name: 'Escrituração Contábil', completed: false },
      { id: 't2_5', name: 'Balancete de Verificação', completed: false },
      { id: 't2_6', name: 'Demonstração do Resultado do Exercício (DRE)', completed: false },
      { id: 't2_7', name: 'Balanço Patrimonial', completed: false }
    ],
    timeSpentMin: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    icon: 'scale',
    colorClass: 'blue'
  },
  {
    id: 'd3',
    name: 'Direitos Humanos',
    topicsTotal: 4,
    topicsDone: 0,
    topics: [
      { id: 't3_1', name: 'Teoria Geral dos Direitos Humanos', completed: false },
      { id: 't3_2', name: 'Declaração Universal dos Direitos Humanos', completed: false },
      { id: 't3_3', name: 'Convenção Americana sobre Direitos Humanos', completed: false },
      { id: 't3_4', name: 'Programa Nacional de Direitos Humanos (PNDH-3)', completed: false }
    ],
    timeSpentMin: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    icon: 'book',
    colorClass: 'purple'
  },
  {
    id: 'd4',
    name: 'Estatística',
    topicsTotal: 6,
    topicsDone: 0,
    topics: [
      { id: 't4_1', name: 'Estatística Descritiva: Médias, Mediana e Moda', completed: false },
      { id: 't4_2', name: 'Medidas de Dispersão: Variância e Desvio Padrão', completed: false },
      { id: 't4_3', name: 'Teoria das Probabilidades', completed: false },
      { id: 't4_4', name: 'Variáveis Aleatórias', completed: false },
      { id: 't4_5', name: 'Inferência Estatística', completed: false },
      { id: 't4_6', name: 'Testes de Hipóteses', completed: false }
    ],
    timeSpentMin: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    icon: 'calculate',
    colorClass: 'yellow'
  },
  {
    id: 'd5',
    name: 'Informática',
    topicsTotal: 6,
    topicsDone: 0,
    topics: [
      { id: 't5_1', name: 'Redes de Computadores e Internet', completed: false },
      { id: 't5_2', name: 'Segurança da Informação (Malwares, Criptografia)', completed: false },
      { id: 't5_3', name: 'Banco de Dados (Modelo ER e SQL)', completed: false },
      { id: 't5_4', name: 'Computação em Nuvem (Cloud Computing)', completed: false },
      { id: 't5_5', name: 'Linguagens Python e R', completed: false },
      { id: 't5_6', name: 'Sistemas Operacionais (Windows e Linux)', completed: false }
    ],
    timeSpentMin: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    icon: 'computer',
    colorClass: 'purple'
  },
  {
    id: 'd6',
    name: 'Legislação Especial',
    topicsTotal: 6,
    topicsDone: 0,
    topics: [
      { id: 't6_1', name: 'Crimes Hediondos (Lei 8.072/90)', completed: false },
      { id: 't6_2', name: 'Tráfico de Drogas (Lei 11.343/06)', completed: false },
      { id: 't6_3', name: 'Estatuto do Desarmamento (Lei 10.826/03)', completed: false },
      { id: 't6_4', name: 'Lei de Tortura (Lei 9.455/97)', completed: false },
      { id: 't6_5', name: 'Crimes Ambientais (Lei 9.605/98)', completed: false },
      { id: 't6_6', name: 'Organizações Criminosas (Lei 12.850/13)', completed: false }
    ],
    timeSpentMin: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    icon: 'shield',
    colorClass: 'emerald'
  }
];

export const INITIAL_REMINDERS: Reminder[] = [
  {
    id: 'r1',
    text: 'INSCRIÇÃO ABERTA',
    type: 'INSCRIÇÕES',
    date: '01/10/25',
    completed: false
  },
  {
    id: 'r2',
    text: 'PROVA POLÍCIA FEDERAL',
    type: 'PROVAS',
    date: '12/11/25',
    completed: false
  }
];

export const INITIAL_MOCK_TESTS: MockTest[] = [];

export const INITIAL_STUDY_BLOCKS: StudyBlock[] = [
  // Seg
  {
    id: 'sb1',
    dayOfWeek: 1,
    shift: 'manha',
    disciplineName: 'Português',
    durationMin: 120,
    type: 'Teoria',
    completed: false
  },
  {
    id: 'sb2',
    dayOfWeek: 1,
    shift: 'noite',
    disciplineName: 'Leitura Lei Seca',
    durationMin: 60,
    type: 'Lei Seca',
    completed: false
  },
  // Ter
  {
    id: 'sb3',
    dayOfWeek: 2,
    shift: 'manha',
    disciplineName: 'Raciocínio Lógico',
    durationMin: 90,
    type: 'Exercícios',
    completed: false
  },
  // Qua (Active day "25")
  {
    id: 'sb4',
    dayOfWeek: 3,
    shift: 'manha',
    disciplineName: 'Direito Administrativo',
    durationMin: 120,
    type: 'Revisão',
    completed: false
  },
  {
    id: 'sb5',
    dayOfWeek: 3,
    shift: 'tarde',
    disciplineName: 'Direito Constitucional',
    durationMin: 90,
    type: 'Questões',
    completed: false
  },
  // Qui
  {
    id: 'sb6',
    dayOfWeek: 4,
    shift: 'noite',
    disciplineName: 'Revisão Ativa',
    durationMin: 60,
    type: 'Revisão',
    completed: false
  },
  // Sex
  {
    id: 'sb7',
    dayOfWeek: 5,
    shift: 'manha',
    disciplineName: 'Informática',
    durationMin: 120,
    type: 'Teoria',
    completed: false
  },
  // Sáb
  {
    id: 'sb8',
    dayOfWeek: 6,
    shift: 'manha',
    disciplineName: 'Leitura Lei Seca',
    durationMin: 60,
    type: 'Lei Seca',
    completed: false
  },
  // Dom
  {
    id: 'sb9',
    dayOfWeek: 7,
    shift: 'manha',
    disciplineName: 'Simulado Geral',
    durationMin: 180,
    type: 'Simulado',
    completed: false
  }
];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];

export const STREAK_DAYS: StreakDay[] = [
  { dateString: '10/10', status: 'future' },
  { dateString: '11/10', status: 'future' },
  { dateString: '12/10', status: 'future' },
  { dateString: '13/10', status: 'future' },
  { dateString: '14/10', status: 'future' },
  { dateString: '15/10', status: 'future' },
  { dateString: '16/10', status: 'future' },
  { dateString: '17/10', status: 'future' },
  { dateString: '18/10', status: 'future' },
  { dateString: '19/10', status: 'future' },
  { dateString: '20/10', status: 'future' },
  { dateString: '21/10', status: 'future' },
  { dateString: '22/10', status: 'future' },
  { dateString: '23/10', status: 'future' },
  { dateString: '24/10', status: 'future' },
  { dateString: '25/10', status: 'future' }
];

export const MOTIVATIONAL_QUOTES = [
  {
    text: "Coragem é a resistência e o domínio do medo, não a ausência dele",
    author: "Mark Twain"
  },
  {
    text: "O sucesso é a soma de pequenos esforços repetidos dia após dia",
    author: "Robert Collier"
  },
  {
    text: "Paciência e persistência têm um efeito mágico ante o qual as dificuldades desaparecem",
    author: "John Quincy Adams"
  },
  {
    text: "A disciplina é a ponte entre metas e realizações",
    author: "Jim Rohn"
  }
];

export const INITIAL_EXERCISE_LOGS: ExerciseLog[] = [];

