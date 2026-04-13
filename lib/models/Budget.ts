import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IBudget extends Document {
  userId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  category: string;
  monthlyLimit: number;
  alertAt: number;
  currency: string;
  createdAt: Date;
}

const BudgetSchema = new Schema<IBudget>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: "Workspace",
    required: true,
  },
  category: { type: String, required: true },
  monthlyLimit: { type: Number, required: true, min: 1 },
  alertAt: { type: Number, default: 80 },
  currency: { type: String, default: "INR" },
  createdAt: { type: Date, default: Date.now },
});

BudgetSchema.index(
  { userId: 1, workspaceId: 1, category: 1 },
  { unique: true }
);

export const Budget: Model<IBudget> =
  mongoose.models.Budget || mongoose.model<IBudget>("Budget", BudgetSchema);

export default Budget;
