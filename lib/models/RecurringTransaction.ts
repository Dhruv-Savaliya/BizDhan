import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurringType = 'income' | 'expense';

export interface IRecurringTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  type: RecurringType;
  amount: number;
  category: string;
  description: string;
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date | null;
  nextRunDate: Date;
  lastRunDate?: Date;
  isActive: boolean;
  autoCategory: boolean;
  createdAt: Date;
}

export const calculateNextRun = (
  startDate: Date,
  frequency: RecurringFrequency
): Date => {
  const next = new Date(startDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      break;
  }

  return next;
};

const RecurringTransactionSchema = new Schema<IRecurringTransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, default: null },
  nextRunDate: { type: Date, required: true },
  lastRunDate: { type: Date },
  isActive: { type: Boolean, default: true },
  autoCategory: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

RecurringTransactionSchema.pre('save', function (next) {
  if (!this.nextRunDate) {
    this.nextRunDate = calculateNextRun(this.startDate, this.frequency);
  }
  next();
});

RecurringTransactionSchema.index({
  userId: 1,
  workspaceId: 1,
  nextRunDate: 1,
  isActive: 1,
});

export const RecurringTransaction: Model<IRecurringTransaction> =
  mongoose.models.RecurringTransaction ||
  mongoose.model<IRecurringTransaction>(
    'RecurringTransaction',
    RecurringTransactionSchema
  );

export default RecurringTransaction;
