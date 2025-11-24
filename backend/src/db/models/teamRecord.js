import mongoose from 'mongoose'

const { Schema, model } = mongoose

const teamRecordDefinition = {
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  eliminated: { type: Boolean, default: false },
  initialBye: { type: Boolean, default: false },
}

const teamRecordSchema = new Schema(teamRecordDefinition, { _id: false })

const teamRecordModelSchema = new Schema(teamRecordDefinition, { timestamps: true })
teamRecordModelSchema.index({ team: 1 }, { unique: true })

const TeamRecord = model('TeamRecord', teamRecordModelSchema)

/**
 * @typedef {import('mongoose').InferSchemaType<typeof teamRecordModelSchema>} TeamRecord
 */

export default TeamRecord
export { TeamRecord, teamRecordSchema }
