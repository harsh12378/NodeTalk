const mongoose = require("mongoose");
const Chat = require("../models/chat");

exports.getOrCreateChat = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { friendId } = req.body;

    // --- Validation ---
    if (!friendId) {
      return res.status(400).json({ message: "friendId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ message: "Invalid friendId" });
    }

    if (userId === friendId) {
      return res.status(400).json({ message: "Cannot create chat with yourself" });
    }

    // --- Stable deduplication key (sorted pair) ---
    const sorted = [userId, friendId].sort();
    const chatKey = `${sorted[0]}_${sorted[1]}`;

    // --- Build participant subdocs for $setOnInsert ---
    const now = new Date();

    const participantDocs = sorted.map((id) => ({
      user: id,
      role: "member",
      joinedAt: now,
      deletedAt: null,
      lastReadAt: null,
    }));

    // --- Upsert ---
    const chat = await Chat.findOneAndUpdate(
      { chatKey },
      {
        $setOnInsert: {
          participants: participantDocs,
          chatKey,
          isGroup: false,
          createdBy: userId,
        },
      },
      {
        new: true,
        upsert: true,
        // Prevent duplicate key race condition on concurrent requests
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      chatId: chat._id,
    });

  } catch (error) {
    // Duplicate key = two concurrent requests raced; safe to retry read
    if (error.code === 11000) {
      const sorted = [req.user.userId, req.body.friendId].sort();
      const chatKey = `${sorted[0]}_${sorted[1]}`;
      const existing = await Chat.findOne({ chatKey }).select("_id");
      return res.status(200).json({ success: true, chatId: existing._id });
    }

    console.error("getOrCreateChat error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};