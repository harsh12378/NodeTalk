const jwt=require('jsonwebtoken');
const User=require('../models/user.js');


exports.getAllUsers = async (req, res) => {
  
  try {
    const userId = req.user.userId;
    const me = await User.findById(userId)
    await User.findByIdAndUpdate(userId,{lastSeen:Date.now()});
    if (!me) {
      return res.status(404).json({ message: "User not found" });
    }
    const users = await User.find({ _id: { $ne: userId } });

    const finalList = users.map((user) => {
      const relation = me.friends.find(
        (f) => f.friendId.toString() === user._id.toString()
      );

      let friendshipStatus = "none"; // default
      if (relation) {
        friendshipStatus = relation.status; // "pending" or "accepted"
      }

      return {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        isOnline: user.isOnline,
        friendshipStatus,
        lastSeen: user.lastSeen,
      };
    });

    return res.status(200).json(finalList);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Some server error in finding users" });
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