const bycript=require('bcryptjs');
const jwt=require('jsonwebtoken');
const User=require('../models/user');
const { OAuth2Client } = require("google-auth-library");

const generateToken=(userId)=>{
    return jwt.sign({userId},process.env.JWT_SECRET,{
        expiresIn:'7d'
    });
};

const validateSignupData=(name,email,password)=>{
    const errors=[];

    if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Please provide a valid email address');
  }
  
  if (!password || password.length < 4) {
    errors.push('Password must be at least 6 characters long');
  }
  
  return errors;

}

exports.postSignup=async (req,res)=>{
    const {name,email,password}=req.body;
    try{

        const validateInput=validateSignupData(name,email,password);
        if(validateInput.length>0){
            return res.status(400).json({
                success:false,
                message:"invalid input",
                errors: validateInput
            });
        };

        const userExists=await User.findOne({email: email.trim().toLowerCase()});
        if(userExists){
            return res.status(400).json({
                success:false,
                message: "user already exsists"
            });
        }
        else{
            const hashedPassword= await bycript.hash(password,10);
            const user =new User({

                name: name.trim()
                ,email:email.trim().toLowerCase()
                ,password: hashedPassword
            
            });
            await user.save();
             const token =generateToken(user._id);
            res.status(201).json({
                message:" user registerd",
                user:{
                     id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                isOnline:user.isOnline
                }
            })
        }
    } catch(error){
           if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Server error - cannot register user"
    });
        }
}

exports.postLogin =async(req,res)=>{
  const {email,password}=req.body;

  const user =await User.findOne({email});
  
  if(!user){
    return res.status(404).json({message:"user not found"});

  }
  const isMatch=await bycript.compare(password,user.password);
  
   if(!isMatch){
    return res.status(401).json({message:"wrong password"});
   }
   const token=generateToken(user._id);
   res.json({token});
}

exports.updateData=async(req,res)=>{

   const authHeader=req.get('authorization');
    const token=authHeader&&authHeader.split(" ")[1];

    if(!token){
      return res.status(401).json({ message: "No token provided" });
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  userId=decoded.userId;
  const { name, currentPassword, newPassword } = req.body;

   try{
      let updateFields = { lastSeen: Date.now() };
      if (name) {
       updateFields.name = name;
     }
     
   if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Old password required" });
      }
      
      const user = await User.findById(userId);
      const isMatch = await bycript.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Old password incorrect" });
      }
         
      const hashedPassword = await bycript.hash(newPassword, 10);
      updateFields.password = hashedPassword;
    }
    await User.findByIdAndUpdate(userId, updateFields);
   
    return res.status(200).json({message:"succesfully updated"})
   }
   catch{
    return res.status(404).json({message:"some server error"})
   }
   
}

exports.getProfileData=async(req,res)=>{
   const authHeader=req.get('authorization');
    const token=authHeader&&authHeader.split(" ")[1];

    if(!token){
      return res.status(401).json({ message: "No token provided" });
  }

  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId=decoded.userId;
    const user= await User.findOne({_id:userId});
    
    return res.status(200).json({
      name:user.name,
      email:user.email
    })
  }catch{
    return res.status(400).json({message:"some server error"});
  }

}

exports.googleAuth=async(req,res)=>{
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  try{
    
    const { access_token } = req.body;
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const userInfo = await userInfoRes.json();
    let user=await User.findOne({email:userInfo.email});

    if(!user){
      user =new User({
        name:userInfo.name,
        email:userInfo.email,
        googleId:userInfo.sub,
        avatar:userInfo.picture,
        lastSeen: Date.now()
      })
      await user.save();
      console.log(user);
    }
    const authToken=generateToken(user._id);
   return res.json({
      success: true,
      token: authToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  }catch(error){
    console.log("google auth error",error);
    return  res.status(401).json({ success: false, message: "Google authentication failed" });
  }
}