import mongoose, { Schema, Document } from "mongoose";

export interface IBanEvent {
  reportCountInWindow: number;
  bannedAt: Date;
  banType: "temporary" | "permanent";
}

export interface IReportRecord extends Document {
  deviceId: string;
  totalLifetimeReports: number;
  isPermanentlyBlocked: boolean;
  banEvents: IBanEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const banEventSchema = new Schema<IBanEvent>(
  {
    reportCountInWindow: { type: Number, required: true },
    bannedAt: { type: Date, required: true, default: Date.now },
    banType: {
      type: String,
      enum: ["temporary", "permanent"],
      required: true,
    },
  },
  { _id: false }
);

const reportRecordSchema = new Schema<IReportRecord>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    totalLifetimeReports: {
      type: Number,
      required: true,
      default: 0,
    },
    isPermanentlyBlocked: {
      type: Boolean,
      required: true,
      default: false,
    },
    banEvents: {
      type: [banEventSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Index for fast Bloom filter hydration on startup
reportRecordSchema.index({ isPermanentlyBlocked: 1 });

export default mongoose.model<IReportRecord>(
  "ReportRecord",
  reportRecordSchema
);
