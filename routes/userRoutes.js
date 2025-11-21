import { requireAuth } from '@clerk/express';
import express from 'express';

import { getUserRecentMessages } from '../controllers/messageController.js';
import {
  acceptConnectionRequest,
  discoverUsers,
  followUser,
  getUserData,
  getUserProfiles,
  getUsersConnections,
  sendConnectionRequest,
  unfollowUser,
  updateUserData,
} from '../controllers/userController.js';
import { protect } from '../middlewares/auth.js';
import { upload } from './../configs/multer.js';
const userRouter = express.Router();

userRouter.get('/data', protect, requireAuth(), getUserData);

userRouter.post(
  '/update',
  upload.fields([
    { name: 'profile', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  protect,
  updateUserData
);
userRouter.post('/discover', protect, discoverUsers);
userRouter.post('/follow', protect, followUser);
userRouter.post('/unfollow', protect, unfollowUser);
userRouter.post('/connect', protect, sendConnectionRequest);
userRouter.post('/accept', protect, acceptConnectionRequest);
userRouter.get('/connections', protect, requireAuth(), getUsersConnections);

// userRouter.get('/profile', protect, getUserProfiles);
userRouter.post('/profiles', requireAuth(), getUserProfiles);
userRouter.get('/recent-messages', protect, getUserRecentMessages);

export default userRouter;
