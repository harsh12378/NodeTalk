const mongoose = require("mongoose");
const Chat = require("../models/chat");
const invalidateInboxCache = require("../utils/invalidateInbox");
const invalidateMessageCache = require("../utils/invalidateMessages");
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


exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.params;
    
    console.log(`\n📞 MARK AS READ REQUEST RECEIVED`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Chat ID: ${chatId}\n`);
 
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      console.error(`   ❌ Invalid chatId: ${chatId}`);
      return res.status(400).json({ message: "Invalid chatId" });
    }
 
    // Update lastReadAt for this user in the chat's participants array
    const chat = await Chat.findOneAndUpdate(
      {
        _id: chatId,
        "participants.user": userId,
        "participants.deletedAt": null
      },
      {
        $set: { "participants.$.lastReadAt": new Date() }
      },
      { new: true }
    ).select("_id participants");
 
    if (!chat) {
      console.error(`   ❌ Chat not found for user ${userId} in chat ${chatId}`);
      return res.status(404).json({ message: "Chat not found" });
    }
    
    console.log(`   ✅ Database updated - lastReadAt set`);
 
    // Bust inbox cache so next getAllUsers returns unreadCount: 0
    await invalidateInboxCache([userId]);
    console.log(`   ✅ Inbox cache invalidated`);
 
    // Emit to user's own room → all open tabs/devices update instantly
    console.log(`   📤 Emitting unreadCountUpdate to room: user:${userId}`);
    req.io.to(`user:${userId}`).emit("unreadCountUpdate", {
      chatId,
      unreadCount: 0
    });
    console.log(`   ✅ Socket event emitted\n`);
 
    return res.status(200).json({ success: true });
 
  } catch (error) {
    console.error("❌ markAsRead error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};