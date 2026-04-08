import mongoose from 'mongoose';

const askHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    sources: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

askHistorySchema.index({ userId: 1, createdAt: -1 });

export const AskHistory = mongoose.model('AskHistory', askHistorySchema);
