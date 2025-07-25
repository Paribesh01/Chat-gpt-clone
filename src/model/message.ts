import mongoose, { Schema } from "mongoose";

const MessageSchema = new Schema(
  {
    chat: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User" },
    content: { type: String, required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Message ||
  mongoose.model("Message", MessageSchema);
