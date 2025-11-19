import mongoose from 'mongoose'

const { Schema, model } = mongoose

const answerOptionSchema = new Schema(
  {
    key: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
)

const questionSchema = new Schema(
  {
    category: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    prompt: { type: String, required: true },
    answers: { type: [answerOptionSchema], default: undefined },
    correctAnswerKey: { type: String, required: true },
    explanation: { type: String },
    tags: [{ type: String }],
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
)

/**
 * @typedef {import('mongoose').InferSchemaType<typeof questionSchema>} Question
 */

const Question = model('Question', questionSchema)

export default Question
export { questionSchema }
