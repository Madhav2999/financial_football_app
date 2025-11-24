import mongoose from 'mongoose'

const { Schema, model } = mongoose

const eventSchema = new Schema(
  {
    timestamp: { type: Date, default: Date.now },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
  },
  { _id: false }
)

const liveMatchSchema = new Schema(
  {
    match: { type: Schema.Types.ObjectId, ref: 'Match' },
    matchRefId: { type: String, required: true, unique: true },
    tournamentId: { type: String },
    tournamentMatchId: { type: String },
    moderatorId: { type: String },
    teams: [{ type: String }],
    status: { type: String, enum: ['coin-toss', 'in-progress', 'paused', 'completed'], default: 'coin-toss' },
    state: { type: Schema.Types.Mixed, required: true },
    events: { type: [eventSchema], default: [] },
  },
  { timestamps: true }
)

liveMatchSchema.index({ matchRefId: 1 }, { unique: true })

/**
 * @typedef {import('mongoose').InferSchemaType<typeof liveMatchSchema>} LiveMatch
 */

const LiveMatch = model('LiveMatch', liveMatchSchema)

export default LiveMatch
export { liveMatchSchema }
