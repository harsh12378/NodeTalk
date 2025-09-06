const mongoose=require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema=new mongoose.Schema({
   
        name:{type: String, required:true},
        email:{type: String, required:true},
        password:{type: String},
        googleId: { type: String, unique: true },
        avatar:{
            type:String, default:" "
        },
        friends :[
               {
                friendId:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
                status:{type: String, enum:["pending","accepted","rejected"]},
                requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                createdAt:{type: Date,default:Date.now}
               }
        ],
        isOnline:{
            type:Boolean,
            default:false
        },
         lastSeen: {
         type: Date,
         default: Date.now
          },
  
        socketId: {
        type: String,
        default: null
    }

}, { 
    timestamps: true,
    versionKey: false
})


module.exports=mongoose.model('User',userSchema);