const constants = {
  matchSettings: {
    halves: 2,
    halfLengthMinutes: Number(process.env.HALF_LENGTH_MINUTES || 20),
    startingBudget: Number(process.env.STARTING_BUDGET || 1000000),
    substitutionsAllowed: Number(process.env.SUBSTITUTIONS || 5),
  },
  notificationChannels: ['match', 'training', 'transfers'],
}

export default constants
