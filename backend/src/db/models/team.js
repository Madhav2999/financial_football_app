import mongoose from 'mongoose'

const { Schema, model } = mongoose

const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    loginId: { type: String, required: true, trim: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    region: { type: String, trim: true },
    coachContact: { type: String, trim: true },
    seed: { type: Number },
    avatarUrl: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
)

teamSchema.index({ loginId: 1 }, { unique: true })

/**
 * @typedef {import('mongoose').InferSchemaType<typeof teamSchema>} Team
 */

const Team = model('Team', teamSchema)

export default Team
export { teamSchema }
