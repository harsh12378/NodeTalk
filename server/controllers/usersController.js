const jwt=require('jsonwebtoken');
const User=require('../models/user.js');
const redisClient = require("../config/redis");
const Chat = require('../models/chat');
const mongoose = require("mongoose");
const { Message } = require("../models/message");

exports.getAllUsers = async (req, res) => {
  try {
    const userId = req.user.userId;
 
    // --- Try Redis cache first ---
    const cacheKey = `inbox:${userId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      User.findByIdAndUpdate(userId, { lastSeen: Date.now() }).catch(console.error);
      return res.status(200).json(JSON.parse(cached));
    }
 
    const me = await User.findById(userId).lean();
    if (!me) {
      return res.status(404).json({ message: "User not found" });
    }
 
    User.findByIdAndUpdate(userId, { lastSeen: Date.now() }).catch(console.error);
 
    const users = await User.find({ _id: { $ne: userId } })
      .select("_id name avatar isOnline lastSeen")
      .lean();
 
    // Fetch all active chats with populated lastMessage
    const chats = await Chat.find({
      "participants.user": userId,
      "participants.deletedAt": null
    })
      .select("participants updatedAt lastMessage")
      .populate("lastMessage", "content messageType senderId createdAt")
      .lean();
 
    // Build map: otherUserId -> { lastActivityAt, lastMessage, unreadCount, chatId }
    // Run all countDocuments in parallel via Promise.all
    const lastActivityMap = {};
 
    await Promise.all(
      chats.map(async (chat) => {
        const otherParticipant = chat.participants.find(
          (p) => p.user.toString() !== userId.toString()
        );
        const meAsParticipant = chat.participants.find(
          (p) => p.user.toString() === userId.toString()
        );
 
        if (!otherParticipant || !meAsParticipant) return;
 
        const otherId = otherParticipant.user.toString();
        const chatTime = chat.updatedAt || new Date(0);
 
        // Unread = messages NOT sent by me, NOT deleted for me, AFTER my lastReadAt
        const unreadQuery = {
          chatId: chat._id,
          senderId: { $ne: new mongoose.Types.ObjectId(userId) },
          deletedFor: { $nin: [userId] }
        };
 
        // If lastReadAt is null, user has never read → all messages are unread
        if (meAsParticipant.lastReadAt) {
          unreadQuery.createdAt = { $gt: meAsParticipant.lastReadAt };
        }
 
        const unreadCount = await Message.countDocuments(unreadQuery);
 
        if (
          !lastActivityMap[otherId] ||
          chatTime > lastActivityMap[otherId].lastActivityAt
        ) {
          lastActivityMap[otherId] = {
            lastActivityAt: chatTime,
            lastMessage: chat.lastMessage || null,
            unreadCount,
            chatId: chat._id
          };
        }
      })
    );
 
    // Build final list
    const finalList = users.map((user) => {
      const relation = me.friends?.find(
        (f) => f.friendId.toString() === user._id.toString()
      );
      const activity = lastActivityMap[user._id.toString()];
 
      return {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        friendshipStatus: relation?.status || "none",
        lastMessageAt: activity?.lastActivityAt || null,
        lastMessage: activity?.lastMessage || null,
        unreadCount: activity?.unreadCount || 0,
        chatId: activity?.chatId || null
      };
    });
 
    // Sort: most recent activity first, then alphabetically
    finalList.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.name.localeCompare(b.name);
    });
 
    await redisClient.setEx(cacheKey, 30, JSON.stringify(finalList));
 
    return res.status(200).json(finalList);
 
  } catch (error) {
    console.error("getAllUsers error:", error);
    return res.status(500).json({ message: "Some server error in finding users" });
  }
};

exports.sendRequest=async(req,res)=>{
    
    try{
        const senderId=req.user.userId;
        const sender= await User.findOne({_id:senderId});
        if(!sender){
            console.log("senderId not found");
             return res.status(404).json({ message: "sender not found" });
        }
        const {to}= req.body;
        const recieverId=to;
        const receiver=await User.findOne({_id:recieverId});
        if(senderId===recieverId){
            return res.status(404).json({message:"you cannot send request to youreself"});
        }
        if(!receiver){
            console.log("reciver not found");
             return res.status(404).json({ message: "Receiver not found" });
        }

       sender.friends.push({
        friendId:recieverId,
        status:"pending",
        requestedBy: senderId,
        createdAt:new Date(),
       })
        await sender.save();
        
        receiver.friends.push({
            friendId:senderId,
            status:"pending",
            requestedBy: senderId ,
            createdAt:new Date(),
        })
         await receiver.save();

         return res.status(201).json({message: "Friend request sent" })
    }catch(error){
      console.error(error);
    return res.status(500).json({ message: "Server error" });
    }

}
exports.getRequestList=async(req,res)=>{
    
    try{
      const userId=req.user.userId;
      const user=await User.findOne({_id:userId}).populate("friends.friendId", "name email avatar isOnline lastSeen");
      if(!user){
        console.log("user not found");
             return res.status(404).json({ message: "user not found" });
      }

      const pendingRequests = user.friends.filter(f => f.status === "pending"&& f.requestedBy.toString() !== userId.toString());
    return res.status(200).json({
      message: "Pending requests fetched successfully",
      requests: pendingRequests
    });


    }catch(error){
        console.log(error);
          return res.status(500).json({ message: "Server error" });
    }
}

exports.acceptRequest=async(req,res)=>{
   
    try{
       
        const userId=req.user.userId;
        const {friendId}=req.body;
        const user=await User.findOne({_id:userId});
        const friend=await User.findOne({_id:friendId});
        if (!user || !friend) {
      return res.status(404).json({ message: "User or Friend not found" });
    }

           const requestIndex = user.friends.findIndex(
      f => f.friendId.toString() === friendId && f.status === "pending"
    );

    if (requestIndex === -1) {
      return res.status(400).json({ message: "No pending request found" });
    }

    user.friends[requestIndex].status = "accepted";

    // ✅ Also add to friend's list if needed
    const friendIndex = friend.friends.findIndex(
      f => f.friendId.toString() === userId
    );

    if (friendIndex !== -1) {
      friend.friends[friendIndex].status = "accepted";
    } else {
      friend.friends.push({ friendId: userId, status: "accepted" });
    }

    await user.save();
    await friend.save();

    return res.status(200).json({ message: "Friend request accepted" });


    }catch(error){
         console.log(error);
          return res.status(500).json({ message: "Server error" });
    }

}


exports.rejectRequest=async(req,res)=>{
    try{
        const userId=req.user.userId;
        const {friendId}=req.body;
        const user=await User.findOne({_id:userId});
        const friend=await User.findOne({_id:friendId});
  
        if (!user || !friend) {
      return res.status(404).json({ message: "User or Friend not found" });
    }

     const requestIndex = user.friends.findIndex(
      f => f.friendId.toString() === friendId && f.status === "pending"
    );

    if (requestIndex === -1) {
      return res.status(400).json({ message: "No pending request found" });
    }

    user.friends[requestIndex].status = "rejected";

    // ✅ Also add to friend's list if needed
    const friendIndex = friend.friends.findIndex(
      f => f.friendId.toString() === userId
    );

    if (friendIndex !== -1) {
      friend.friends[friendIndex].status = "rejected";
    } else {
      friend.friends.push({ friendId: userId, status: "rejected" });
    }

    await user.save();
    await friend.save();

    return res.status(200).json({ message: "Friend request rejected" });


    }catch(error){
         console.log(error);
          return res.status(500).json({ message: "Server error" });
    }

}

exports.getFriends=async(req,res)=>{
  
    try{
        const userId=req.user.userId;
         const user=await User.findOne({_id:userId}).populate("friends.friendId", "name email avatar isOnline lastSeen");
      if(!user){
        console.log("user not found");
             return res.status(404).json({ message: "user not found" });
      }

        const friends = user.friends.filter(f => f.status === "accepted"&& f.friendId.toString() !== userId.toString());
    return res.status(200).json({
      message: "friends fetched successfully",
      friends:friends
    });

}catch(error){ 
  console.log(error);
          return res.status(500).json({ message: "Server error" });

}
}

exports.removeFriend=async(req,res)=>{
  
    try{
       
        const userId=req.user.userId;
        const {friendId}=req.body;
        const user=await User.findOne({_id:userId});
        const friend=await User.findOne({_id:friendId});
        if (!user || !friend) {
      return res.status(404).json({ message: "User or Friend not found" });
       }

      user.friends = user.friends.filter(
     (f) => f.friendId.toString() !== friendId.toString()
       );

   friend.friends = friend.friends.filter(
  (f) => f.friendId.toString() !== userId.toString()
   );

    await user.save();
    await friend.save();
    return res.status(200).json({ message: "Friend removed successfully" });


  }catch(error){
        console.error("Error removing friend:", error);
    return res.status(500).json({ message: "Server error", error });
  }
}