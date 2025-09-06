const mongoose =require('mongoose');
const User =require('./user');
const messageSchema=new mongoose.Schema({
    senderId:{type:mongoose.Schema.ObjectId,ref:User,required:true},
    receiverId:{type:mongoose.Schema.ObjectId,ref:User,required:true},
    text:{type:String,required:true},
    createdAt:{type:Date,default:Date.now},
})

module.exports=mongoose.model("Message",messageSchema);