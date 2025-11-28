import mongoose from 'mongoose'

const { Schema, model } = mongoose

const moderatorRegistrationSchema = new Schema(
  {
    loginId: { type: String, required: true, trim: true, lowercase: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, trim: true },
    permissions: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    linkedModeratorId: { type: Schema.Types.ObjectId, ref: 'Moderator' },
    avatarUrl: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true },
)

moderatorRegistrationSchema.index({ loginId: 1 }, { unique: true })
moderatorRegistrationSchema.index({ email: 1 }, { unique: true })

/**
 * @typedef {import('mongoose').InferSchemaType<typeof moderatorRegistrationSchema>} ModeratorRegistration
 */

const ModeratorRegistration = model('ModeratorRegistration', moderatorRegistrationSchema)

export default ModeratorRegistration
export { moderatorRegistrationSchema }
