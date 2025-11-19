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
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    matchRefId: { type: String, required: true, unique: true },
    streamKey: { type: String },
    state: { type: String, enum: ['waiting', 'live', 'paused', 'completed'], default: 'waiting' },
    scoreboard: {
      homeScore: { type: Number, default: 0 },
      awayScore: { type: Number, default: 0 },
      period: { type: String },
    },
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
