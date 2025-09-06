const bycript=require('bcryptjs');
const jwt=require('jsonwebtoken');
const User=require('../models/user');
const Message =require('../models/message');
const user = require('../models/user');

exports.sendMessage=async(req,res)=>{
   
    try{
          
        const senderId=req.user.userId;
        const sender=await User.findOne({_id:senderId});
        if(!sender){
            console.log("sender not found");
            return res.status(404).json({message:"sender not found"});
        }
        await User.findByIdAndUpdate(senderId, { lastSeen: Date.now() });

        const {to, message}=req.body;
      
        const receiverId=to;
        const receiver=await User.findOne({_id:receiverId});
         if(!receiver){
            console.log("reciever not found");
            return res.status(404).json({message:"reciever not found"});
        }
        const newMessage=new Message({
            senderId,
            receiverId,
            text:message,
        })
      await newMessage.save();
      return res.status(201).json({
        success:true,
        message:"message sent successfully",
        date:newMessage,
      })

    }catch(error){
       console.log("error sending message some error",error);
       return res.status(500).json({ message: "Internal server error" });

    }
}
exports.getMessages=async(req,res)=>{
    
   try{
        
   const senderId=req.user.userId;
   if(!senderId){
        console.log("sender not found in get messages");
       return res.status(400).json({message:"sender not found in get messages"}) 
   }
    await User.findByIdAndUpdate(senderId, { lastSeen: Date.now() });

   const {receiverId}=req.params;;
   if(!receiverId){
        console.log("reciver not found in get messages");
       return res.status(400).json({message:"reciver not found in get messages"}) 
   }

   const mongoose = require('mongoose');
   const senderObjectId = new mongoose.Types.ObjectId(senderId);
   const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

   const messages = await Message.find({
           $or: [
               { senderId: senderObjectId, receiverId: receiverObjectId },
               { senderId: receiverObjectId, receiverId: senderObjectId } 
           ]
       }).sort({ createdAt: 1 });
   return res.json({ success: true, messages });
}catch(error){
   console.log("some error in getting message ",error)
   return res.status(500).json({message:"server error"});
}
}