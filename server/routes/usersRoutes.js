const express=require('express');
const userController=require('../controllers/usersController');
const usersRouter=express.Router();

usersRouter.get('/allusers',userController.getAllUsers);
usersRouter.post('/request',userController.sendRequest);
usersRouter.get('/requestlist',userController.getRequestList);
usersRouter.post('/accept',userController.acceptRequest);
usersRouter.post('/reject',userController.rejectRequest);
usersRouter.get('/friendlist',userController.getFriends);
usersRouter.post('/removefriend',userController.removeFriend);


module.exports=usersRouter;