
const User = require('../models/user');
 // Import the Socket.IO instance
const Chat = require('../models/chat');
const mongoose = require("mongoose");
const { Message } = require("../models/message");
const redisClient = require("../config/redis"); 
const invalidateInboxCache = require("../utils/invalidateInbox");
const invalidateMessageCache = require("../utils/invalidateMessages");

exports.sendMessage = async (req, res) => {

  // ✅ Destructure OUTSIDE try so the catch block can access these on duplicate key retry
  const { to: receiverId, content, messageType = "text", media = null } = req.body;
  const senderId = req.user.userId;

  try {
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

    // --- Get or create the 1-1 chat ---
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

    // ✅ Step 1: Update chat FIRST (bumps updatedAt for inbox ordering + sets preview)
    await Chat.findByIdAndUpdate(chat._id, {
      lastMessage: newMessage._id
    });

    // ✅ Step 2: Invalidate caches AFTER chat is updated
    // so any cache miss re-fetches fresh data with correct lastMessage
    await invalidateMessageCache(chat._id);
    await invalidateInboxCache([senderId, receiverId]);

    // ✅ Step 3: Populate AFTER cache invalidation
    const populatedMessage = await newMessage.populate("senderId", "name avatar");
    const messageData = populatedMessage.toObject();

    // ✅ Step 4: Emit socket events LAST (receivers may immediately query the DB)
    console.log(`📨 EMITTING newMessage to chat:${chat._id}`, {
      messageId: newMessage._id,
      content
    });
    req.io.to(`chat:${chat._id}`).emit("newMessage", messageData);
    req.io.to(`user:${receiverId}`).emit("newMessage", messageData);
    console.log(`📨 EMITTING to receiver room user:${receiverId}`);

    // ✅ Step 5: Return populated message
    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: messageData
    });

  } catch (error) {
    // --- Race condition on chat upsert: another request created the chat simultaneously ---
    if (error.code === 11000) {
      try {
        const sorted = [senderId, receiverId].sort();
        const chat = await Chat.findOne({ chatKey: `${sorted[0]}_${sorted[1]}` });

        if (!chat) {
          return res.status(500).json({ message: "Failed to resolve chat after conflict" });
        }

        const newMessage = await Message.create({
          chatId: chat._id,
          senderId,
          content,
          messageType,
          ...(media && { media })
        });

        await Chat.findByIdAndUpdate(chat._id, { lastMessage: newMessage._id });
        await invalidateMessageCache(chat._id);
        await invalidateInboxCache([senderId, receiverId]);

        const populatedMessage = await newMessage.populate("senderId", "name avatar");
        const messageData = populatedMessage.toObject();

        req.io.to(`chat:${chat._id}`).emit("newMessage", messageData);
        req.io.to(`user:${receiverId}`).emit("newMessage", messageData);

        return res.status(201).json({
          success: true,
          message: "Message sent successfully",
          data: messageData
        });

      } catch (retryError) {
        console.error("sendMessage retry error:", retryError);
        return res.status(500).json({ message: "Internal server error" });
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
 
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const before = req.query.before;
 
    if (before && !mongoose.Types.ObjectId.isValid(before)) {
      return res.status(400).json({ message: "Invalid cursor" });
    }
 
    // --- Redis cache key (scoped per user + page) ---
    const cacheKey = `messages:${chatId}:${userId}:${before || "start"}:${limit}`;
 
    // --- Try cache first ---
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }
 
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
 
    if (before) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }
 
    // --- Fetch from DB ---
    const messages = await Message.find(query)
      .sort({ _id: -1 })          // newest first within the page
      .limit(limit + 1)           // fetch one extra to determine hasMore
      .populate("senderId", "name avatar")
      .lean();
 
    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();  // remove the extra doc
    messages.reverse();           // return oldest → newest for chat UI
 
    const responsePayload = {
      success: true,
      data: messages,
      pagination: {
        hasMore,
        nextCursor: hasMore ? messages[0]._id : null
      }
    };
 
    // --- Cache for 60 seconds ---
    await redisClient.setEx(cacheKey, 60, JSON.stringify(responsePayload));
 
    return res.status(200).json(responsePayload);
 
  } catch (error) {
    console.error("getMessages error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};