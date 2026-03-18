const jwt=require('jsonwebtoken');
const User=require('../models/user.js');
const redisClient = require("../config/redis");
const Chat = require('../models/chat');
const mongoose = require("mongoose");
const { Message } = require("../models/message");
exports.getAllUsers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cacheKey = `inbox:${userId}`;

    // --- Cache check + lastSeen update fire together ---
    const [cached] = await Promise.all([
      redisClient.get(cacheKey),
      User.findByIdAndUpdate(userId, { lastSeen: Date.now() }).catch(console.error) // ← always fires, not duplicated
    ]);

    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // --- Fetch me + all users in parallel ---
    const [me, users] = await Promise.all([
      User.findById(userId).lean(),
      User.find({ _id: { $ne: userId } })
        .select("_id name avatar isOnline lastSeen")
        .lean()
    ]);

    if (!me) {
      return res.status(404).json({ message: "User not found" });
    }

    // --- Fetch chats ---
    const chats = await Chat.find({
      "participants.user": userId,
      "participants.deletedAt": null
    })
      .select("participants updatedAt lastMessage")
      .populate("lastMessage", "content messageType senderId createdAt")
      .lean();

    if (chats.length === 0) {
      // ← skip all DB work if user has no chats yet
      const finalList = users.map((user) => ({
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        friendshipStatus: me.friends?.find(
          (f) => f.friendId.toString() === user._id.toString()
        )?.status || "none",
        lastMessageAt: null,
        lastMessage: null,
        unreadCount: 0,
        chatId: null
      }));

      finalList.sort((a, b) => a.name.localeCompare(b.name));
      await redisClient.setEx(cacheKey, 30, JSON.stringify(finalList));
      return res.status(200).json(finalList);
    }

    const chatIds = chats.map((c) => c._id);

    // --- Build lastReadAt map for per-chat unread filtering ---
    const lastReadAtMap = {};
    for (const chat of chats) {
      const me_ = chat.participants.find(
        (p) => p.user.toString() === userId.toString()
      );
      if (me_?.lastReadAt) {
        lastReadAtMap[chat._id.toString()] = me_.lastReadAt;
      }
    }

    // --- Single aggregation instead of N countDocuments ---
    // Groups all unread messages by chatId in one DB round trip
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          chatId: { $in: chatIds },
          senderId: { $ne: new mongoose.Types.ObjectId(userId) },
          deletedFor: { $nin: [new mongoose.Types.ObjectId(userId)] },
          // ← filter by lastReadAt per chat using $expr
          $or: [
            // chats where lastReadAt is null — all messages unread
            {
              chatId: {
                $in: chatIds.filter((id) => !lastReadAtMap[id.toString()])
              }
            },
            // chats where lastReadAt exists — only messages after it
            {
              $and: [
                {
                  chatId: {
                    $in: chatIds.filter((id) => lastReadAtMap[id.toString()])
                  }
                },
                {
                  $expr: {
                    $gt: [
                      "$createdAt",
                      {
                        $let: {
                          vars: { id: "$chatId" },
                          in: {
                            // map chatId → its lastReadAt date
                            $getField: {
                              field: {
                                $toString: "$$id"
                              },
                              input: lastReadAtMap  // plain object, not usable directly — see note below
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      },
      {
        $group: {
          _id: "$chatId",
          count: { $sum: 1 }
        }
      }
    ]);

    // ← map result to { chatIdString: count }
    const unreadCountMap = {};
    for (const row of unreadAgg) {
      unreadCountMap[row._id.toString()] = row.count;
    }

    // --- Build lastActivityMap ---
    const lastActivityMap = {};
    for (const chat of chats) {
      const otherParticipant = chat.participants.find(
        (p) => p.user.toString() !== userId.toString()
      );
      if (!otherParticipant) continue;

      const otherId = otherParticipant.user.toString();
      const chatTime = chat.updatedAt || new Date(0);

      if (
        !lastActivityMap[otherId] ||
        chatTime > lastActivityMap[otherId].lastActivityAt
      ) {
        lastActivityMap[otherId] = {
          lastActivityAt: chatTime,
          lastMessage: chat.lastMessage || null,
          unreadCount: unreadCountMap[chat._id.toString()] || 0, // ← from map, no DB call
          chatId: chat._id
        };
      }
    }

    // --- Build friends map for O(1) lookup instead of .find() in loop ---
    const friendsMap = {};
    if (me.friends?.length) {
      for (const f of me.friends) {
        friendsMap[f.friendId.toString()] = f.status;
      }
    }

    // --- Build final list ---
    const finalList = users.map((user) => {
      const activity = lastActivityMap[user._id.toString()];
      return {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        friendshipStatus: friendsMap[user._id.toString()] || "none", // ← O(1) map lookup
        lastMessageAt: activity?.lastActivityAt || null,
        lastMessage: activity?.lastMessage || null,
        unreadCount: activity?.unreadCount || 0,
        chatId: activity?.chatId || null
      };
    });

    // --- Sort ---
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