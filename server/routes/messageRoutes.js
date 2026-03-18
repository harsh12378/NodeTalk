const express=require('express');
const messageController=require('../controllers/messageController');
const messageRouter=express.Router();
const upload = require("../middleware/upload");
messageRouter.post('/send', upload.single("media"), messageController.sendMessage);
messageRouter.get('/:chatId',messageController.getMessages);


module.exports=messageRouter;