import mongoose from 'mongoose'

const { Schema, model } = mongoose

const teamRegistrationSchema = new Schema(
  {
    teamName: { type: String, required: true, trim: true },
    organization: { type: String, required: true, trim: true },
    loginId: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    contactName: { type: String, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    coachContact: { type: String, required: true, trim: true },
    county: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    linkedTeamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    avatarUrl: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true },
)

teamRegistrationSchema.index({ teamName: 1, contactEmail: 1 }, { unique: true })
teamRegistrationSchema.index({ loginId: 1 }, { unique: true })

/**
 * @typedef {import('mongoose').InferSchemaType<typeof teamRegistrationSchema>} TeamRegistration
 */

const TeamRegistration = model('TeamRegistration', teamRegistrationSchema)

export default TeamRegistration
export { teamRegistrationSchema }
