
const User = require('../models/user');
 // Import the Socket.IO instance
const Chat = require('../models/chat');
const mongoose = require("mongoose");
const { Message } = require("../models/message");


exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { to: receiverId, content, messageType = "text", media = null } = req.body;

    // --- Validation ---
    if (!receiverId || !content) {
      return res.status(400).json({ message: "receiverId and content are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid receiverId" });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ message: "Cannot send message to yourself" });
    }

    // --- Verify receiver exists ---
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // --- Get or create the 1-1 chat (same logic as getOrCreateChat) ---
    const sorted = [senderId, receiverId].sort();
    const chatKey = `${sorted[0]}_${sorted[1]}`;
    const now = new Date();

    let chat = await Chat.findOneAndUpdate(
      { chatKey },
      {
        $setOnInsert: {
          participants: sorted.map((id) => ({
            user: id,
            role: "member",
            joinedAt: now,
            deletedAt: null,
            lastReadAt: null
          })),
          chatKey,
          isGroup: false,
          createdBy: senderId
        }
      },
      { new: true, upsert: true, runValidators: true }
    );

    // --- Create the message ---
    const newMessage = await Message.create({
      chatId: chat._id,
      senderId,
      content,
      messageType,
      ...(media && { media })
    });
   req.io.to(`chat:${chat._id}`).emit("newMessage", newMessage);
    // --- Update chat's lastMessage + bump updatedAt ---
    await Chat.findByIdAndUpdate(chat._id, {
      lastMessage: newMessage._id
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage
    });

  } catch (error) {
    // Race condition on chat upsert — retry the find
    if (error.code === 11000) {
      const sorted = [req.user.userId, receiverId].sort();
      const chat = await Chat.findOne({ chatKey: `${sorted[0]}_${sorted[1]}` });
      if (chat) {
        const newMessage = await Message.create({
          chatId: chat._id,
          senderId: req.user.userId,
          content: content,
          messageType: messageType || "text",
          ...(media && { media })
        });
        await Chat.findByIdAndUpdate(chat._id, { lastMessage: newMessage._id });
        req.io.to(`chat:${chat._id}`).emit("newMessage", newMessage);
        return res.status(201).json({ success: true, data: newMessage });
      }
    }

    console.error("sendMessage error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.params;

    // --- Validation ---
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chatId" });
    }

    // --- Cursor-based pagination params ---
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const before = req.query.before; // message _id cursor (load older messages)

    // --- Verify chat exists and user is a participant ---
    const chat = await Chat.findOne({
      _id: chatId,
      "participants.user": userId,
      "participants.deletedAt": null
    }).select("_id");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // --- Build query ---
    const query = {
      chatId,
      deletedFor: { $nin: [userId] }
    };

    // If cursor provided, fetch messages older than that message
    if (before) {
      if (!mongoose.Types.ObjectId.isValid(before)) {
        return res.status(400).json({ message: "Invalid cursor" });
      }
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    // --- Fetch messages ---
    const messages = await Message.find(query)
      .sort({ _id: -1 })           // newest first within the page
      .limit(limit + 1)            // fetch one extra to determine hasMore
      .populate("senderId", "name avatar")
      .lean();

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();   // remove the extra doc

    // Return in ascending order (oldest first) for chat UI rendering
    messages.reverse();

    return res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        hasMore,
        nextCursor: hasMore ? messages[0]._id : null
      }
    });

  } catch (error) {
    console.error("getMessages error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};