import mongoose from 'mongoose'

const { Schema, model } = mongoose

const resultSchema = new Schema(
  {
    homeScore: { type: Number, default: 0 },
    awayScore: { type: Number, default: 0 },
    winnerTeam: { type: Schema.Types.ObjectId, ref: 'Team' },
  },
  { _id: false }
)

const matchSchema = new Schema(
  {
    matchRefId: { type: String, trim: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    stage: { type: Schema.Types.ObjectId, ref: 'Stage' },
    homeTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    awayTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    scheduledAt: { type: Date },
    status: { type: String, enum: ['scheduled', 'live', 'completed'], default: 'scheduled' },
    result: resultSchema,
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
)

matchSchema.index({ matchRefId: 1 }, { sparse: true })

/**
 * @typedef {import('mongoose').InferSchemaType<typeof matchSchema>} Match
 */

const Match = model('Match', matchSchema)

export default Match
export { matchSchema }
