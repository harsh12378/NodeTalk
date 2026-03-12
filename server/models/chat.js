const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    role: {
      type: String,
      enum: ["member", "admin"],
      default: "member"
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    // Per-user soft delete: hides chat from their inbox
    deletedAt: {
      type: Date,
      default: null
    },
    // Last time this user read the chat (for unread counts)
    lastReadAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    participants: {
      type: [participantSchema],
      validate: {
        validator: (arr) => arr.length >= 2,
        message: "A chat must have at least 2 participants"
      }
    },

    // Stable deduplication key for 1-on-1 chats
    // Convention: sorted userId pair → "uid1_uid2"
    chatKey: {
      type: String,
      unique: true,
      sparse: true,
      comment: "Only set for direct (non-group) chats. Sorted user ID pair."
    },

    isGroup: {
      type: Boolean,
      default: false,
      index: true
    },

    // Only populated when isGroup: true
    groupMeta: {
      name: { type: String, trim: true },
      avatarUrl: { type: String }
    },

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

/* INDEXES */

// Inbox: fetch all active chats for a user, newest first
// The $elemMatch on participants.user + deletedAt null uses this
chatSchema.index({
  "participants.user": 1,
  "participants.deletedAt": 1,
  updatedAt: -1
});

// Admin tooling / group listing
chatSchema.index({ isGroup: 1, updatedAt: -1 });

module.exports = mongoose.model("Chat", chatSchema);