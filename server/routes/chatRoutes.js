const express=require('express');
const chatController=require('../controllers/chatController');
const chat = require('../models/chat');
const chatRouter=express.Router();

chatRouter.post('/get-or-create',chatController.getOrCreateChat);
chatRouter.post('/:chatId/read',chatController.markAsRead);
module.exports=chatRouter;