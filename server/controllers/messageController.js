
const User = require('../models/user');
 // Import the Socket.IO instance
const Chat = require('../models/chat');
const mongoose = require("mongoose");
const { Message } = require("../models/message");
const redisClient = require("../config/redis"); 

const invalidateInboxCache = require("../utils/invalidateInbox");
const appendMessageToCache = require("../utils/apendMessageCache"); // ← new, replaces invalidateMessages

exports.sendMessage = async (req, res) => {
  let media = null;
  if (req.file) {
    media = {
      url: req.file.path,
      publicId: req.file.filename,
      resourceType: req.file.mimetype.startsWith("video/") ? "video" : "image",
      bytes: req.file.size,
      width: req.file.width,
      height: req.file.height,
      ...(req.file.duration && { duration: req.file.duration }),
    };
  }

  const {
    to: receiverId,
    content = "",   // ← default to "" so media-only messages don't fail validation
    messageType = req.file
      ? req.file.mimetype.startsWith("video/") ? "video" : "image"
      : "text",
  } = req.body;

  const senderId = req.user.userId;

  try {
    // --- Validation ---
    // ← content OR media must be present, not both required
    if (!receiverId || (!content && !req.file)) {
      return res.status(400).json({ message: "receiverId and content or media are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid receiverId" });
    }
    if (senderId === receiverId) {
      return res.status(400).json({ message: "Cannot send message to yourself" });
    }

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // --- Get or create 1-1 chat ---
    const sorted = [senderId, receiverId].sort();
    const chatKey = `${sorted[0]}_${sorted[1]}`;
    const now = new Date();

    const chat = await Chat.findOneAndUpdate(
      { chatKey },
      {
        $setOnInsert: {
          participants: sorted.map((id) => ({
            user: id,
            role: "member",
            joinedAt: now,
            deletedAt: null,
            lastReadAt: null,
          })),
          chatKey,
          isGroup: false,
          createdBy: senderId,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    // --- Create message ---
    const newMessage = await Message.create({
      chatId: chat._id,
      senderId,
      content,
      messageType,
      ...(media && { media }),
    });

    // --- Populate early so messageData is ready for cache + socket ---
    const populatedMessage = await newMessage.populate("senderId", "name avatar");
    const messageData = populatedMessage.toObject();

    // --- Receiver's unread query (build before parallel block) ---
    const receiverParticipant = chat.participants.find(
      (p) => p.user.toString() === receiverId.toString()
    );
    const unreadQuery = {
      chatId: chat._id,
      senderId: { $ne: new mongoose.Types.ObjectId(receiverId) },
      deletedFor: { $nin: [receiverId] },
    };
    if (receiverParticipant?.lastReadAt) {
      unreadQuery.createdAt = { $gt: receiverParticipant.lastReadAt };
    }

    // --- All independent operations in parallel ---
    const [, receiverUnreadCount] = await Promise.all([
      Chat.findByIdAndUpdate(chat._id, { lastMessage: newMessage._id }), // ← parallel
      Message.countDocuments(unreadQuery),                                // ← parallel
      appendMessageToCache(chat._id, messageData),                       // ← append, not invalidate
      invalidateInboxCache([senderId, receiverId]),                       // ← inbox still invalidates (correct)
    ]);

    // --- Emit socket events ---
    req.io.to(`chat:${chat._id}`).emit("newMessage", messageData);
    req.io.to(`user:${receiverId}`).emit("newMessage", messageData);
    req.io.to(`user:${receiverId}`).emit("unreadCountUpdate", {
      chatId: chat._id,
      senderId,
      unreadCount: receiverUnreadCount,
      lastMessage: {
        content,
        messageType,
        createdAt: newMessage.createdAt,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: messageData,
    });

  } catch (error) {
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
          ...(media && { media }),
        });

        const populatedMessage = await newMessage.populate("senderId", "name avatar");
        const messageData = populatedMessage.toObject();

        // ← retry block also gets parallel ops + cache append
        await Promise.all([
          Chat.findByIdAndUpdate(chat._id, { lastMessage: newMessage._id }),
          appendMessageToCache(chat._id, messageData),
          invalidateInboxCache([senderId, receiverId]),
        ]);

        req.io.to(`chat:${chat._id}`).emit("newMessage", messageData);
        req.io.to(`user:${receiverId}`).emit("newMessage", messageData);
        req.io.to(`user:${receiverId}`).emit("unreadCountUpdate", {
          chatId: chat._id,
          senderId,
          unreadCount: 1,
          lastMessage: { content, messageType, createdAt: newMessage.createdAt },
        });

        return res.status(201).json({
          success: true,
          message: "Message sent successfully",
          data: messageData,
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
