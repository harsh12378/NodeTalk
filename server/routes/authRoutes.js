const express=require('express');
const authController=require('../controllers/authController');
const authRouter=express.Router();

authRouter.post('/login',authController.postLogin);
authRouter.post('/signup',authController.postSignup);
authRouter.put('/update',authController.updateData);
authRouter.get("/me",authController.getProfileData);
authRouter.post("/googleauth",authController.googleAuth);
module.exports=authRouter;