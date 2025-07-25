import mongoose, { Schema } from "mongoose";

const ChatSchema = new Schema(
  {
    title: { type: String, default: "New Chat" },
    userId: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Chat || mongoose.model("Chat", ChatSchema);
