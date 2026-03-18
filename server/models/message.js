const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    content: {
      type: String,
      default: null
    },

    messageType: {
      type: String,
      enum: ["text", "image", "video", "file"],
      default: "text"
    },

    media: {
      url:      { type: String, default: null },
      filename: { type: String, default: null },
      size:     { type: Number, default: null }
    },

    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true,
    versionKey: false
  }
);

messageSchema.index({ chatId: 1, createdAt: -1 });

/* ================= */

const readReceiptSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true
    },

    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    readAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

readReceiptSchema.index({ messageId: 1, userId: 1 }, { unique: true });
readReceiptSchema.index({ chatId: 1, userId: 1 });

const Message = mongoose.model("Message", messageSchema);
const ReadReceipt = mongoose.model("ReadReceipt", readReceiptSchema);

module.exports = { Message, ReadReceipt };