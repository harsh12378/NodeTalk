const express=require('express');
const messageController=require('../controllers/messageController');
const messageRouter=express.Router();

messageRouter.post('/send',messageController.sendMessage);
messageRouter.get('/:chatId',messageController.getMessages);


module.exports=messageRouter;