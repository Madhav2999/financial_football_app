import mongoose from 'mongoose'

const { Schema, model } = mongoose

const moderatorSchema = new Schema(
  {
    loginId: { type: String, required: true, trim: true, unique: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, trim: true },
    role: { type: String, enum: ['moderator', 'admin'], default: 'moderator' },
    active: { type: Boolean, default: true },
    permissions: [{ type: String }],
    avatarUrl: { type: String },
  },
  { timestamps: true }
)

moderatorSchema.index({ loginId: 1 }, { unique: true })

/**
 * @typedef {import('mongoose').InferSchemaType<typeof moderatorSchema>} Moderator
 */

const Moderator = model('Moderator', moderatorSchema)

export default Moderator
export { moderatorSchema }
