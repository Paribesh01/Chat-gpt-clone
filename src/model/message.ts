// models/message.ts

import mongoose, { Schema } from "mongoose";

const FileSchema = new Schema(
  {
    id: String,
    name: String,
    type: String,
    url: String,
    extractedText: String,
  },
  { _id: false } // ← important so Mongoose doesn't try to auto-create _id inside files[]
);

const MessageSchema = new Schema(
  {
    chat: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User" },
    content: { type: String, required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    files: [FileSchema], // ← use sub-schema to guarantee Mongoose interprets it right
  },
  { timestamps: true }
);

export default mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", MessageSchema); // ← renamed the model to force a reset
