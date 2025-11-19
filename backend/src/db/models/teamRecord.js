import mongoose from 'mongoose'

const { Schema } = mongoose

const teamRecordSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    eliminated: { type: Boolean, default: false },
    initialBye: { type: Boolean, default: false },
  },
  { _id: false }
)

/**
 * @typedef {import('mongoose').InferSchemaType<typeof teamRecordSchema>} TeamRecord
 */

export { teamRecordSchema }
