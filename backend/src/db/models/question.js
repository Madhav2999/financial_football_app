import mongoose from 'mongoose'

const { Schema, model } = mongoose

const answerSchema = new Schema(
  {
    key: { type: String },
    text: { type: String },
  },
  { _id: false },
)

const questionSchema = new Schema(
  {
    prompt: { type: String, required: true, unique: true },
    answers: [answerSchema],
    correctAnswerKey: { type: String, required: true },
    category: { type: String },
    difficulty: { type: String },
    tags: { type: [String], default: [] },
    stats: {
      timesAsked: { type: Number, default: 0 },
      correctCount: { type: Number, default: 0 },
      incorrectCount: { type: Number, default: 0 },
      byTeam: {
        type: [
          {
            team: { type: Schema.Types.ObjectId, ref: 'Team' },
            correct: { type: Number, default: 0 },
            incorrect: { type: Number, default: 0 },
          },
        ],
        default: [],
      },
    },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true },
)

const Question = model('Question', questionSchema)

export default Question
