import mongoose from 'mongoose'
import { teamRecordSchema } from './teamRecord.js'

const { Schema, model } = mongoose

const stageSchema = new Schema(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['group', 'knockout', 'play-in', 'final'], default: 'group' },
    order: { type: Number, default: 0 },
    bestOf: { type: Number, default: 1 },
    teamRecords: { type: [teamRecordSchema], default: [] },
    matches: [{ type: Schema.Types.ObjectId, ref: 'Match' }],
  },
  { timestamps: true }
)

/**
 * @typedef {import('mongoose').InferSchemaType<typeof stageSchema>} Stage
 */

const Stage = model('Stage', stageSchema)

export default Stage
export { stageSchema }
