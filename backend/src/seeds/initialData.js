export const seedTeams = [
  { name: 'North City Bulls', loginId: 'team-north-bulls', region: 'North', seed: 1 },
  { name: 'East Harbor Jets', loginId: 'team-east-jets', region: 'East', seed: 2 },
  { name: 'South Bay Guardians', loginId: 'team-south-guardians', region: 'South', seed: 3 },
]

export const seedModerators = [
  {
    loginId: 'mod-avery',
    email: 'avery.moderator@financialfootball.test',
    displayName: 'Avery',
    role: 'moderator',
  },
  {
    loginId: 'mod-river',
    email: 'river.moderator@financialfootball.test',
    displayName: 'River',
    role: 'moderator',
  },
]

export const seedQuestions = [
  {
    category: 'Budgeting',
    difficulty: 'easy',
    prompt: 'What is the purpose of creating an emergency fund?',
    answers: [
      { key: 'A', text: 'To cover unexpected expenses without debt' },
      { key: 'B', text: 'To invest in high-risk stocks' },
      { key: 'C', text: 'To pay for entertainment only' },
      { key: 'D', text: 'To increase your credit card limit' },
    ],
    correctAnswerKey: 'A',
    explanation: 'Emergency funds keep teams financially resilient during surprises.',
    tags: ['savings'],
  },
  {
    category: 'Credit',
    difficulty: 'medium',
    prompt: 'Which action is most likely to improve a credit score?',
    answers: [
      { key: 'A', text: 'Maxing out every credit card' },
      { key: 'B', text: 'Making on-time payments' },
      { key: 'C', text: 'Closing the oldest account' },
      { key: 'D', text: 'Ignoring credit reports' },
    ],
    correctAnswerKey: 'B',
    explanation: 'Consistent on-time payments demonstrate reliability.',
    tags: ['credit'],
  },
]
