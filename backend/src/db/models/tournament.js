import mongoose from 'mongoose'
import { teamRecordSchema } from './teamRecord.js'

const { Schema, model } = mongoose

const tournamentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'upcoming', 'live', 'completed', 'archived'],
      default: 'draft',
      index: true,
    },
    description: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    stages: [{ type: Schema.Types.ObjectId, ref: 'Stage' }],
    standings: { type: [teamRecordSchema], default: [] },
    state: { type: Schema.Types.Mixed, default: null },
    settings: {
      bracketSize: { type: Number },
      doubleElimination: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
)

/**
 * @typedef {import('mongoose').InferSchemaType<typeof tournamentSchema>} Tournament
 */

const Tournament = model('Tournament', tournamentSchema)

export default Tournament
export { tournamentSchema }
