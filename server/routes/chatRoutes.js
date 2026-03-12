const express=require('express');
const chatController=require('../controllers/chatController');
const chatRouter=express.Router();

chatRouter.post('/get-or-create',chatController.getOrCreateChat);

module.exports=chatRouter;