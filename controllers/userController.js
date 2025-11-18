import fs from 'fs';
import imageKit from '../configs/imageKit.js';
import Connection from '../models/Connections.js';
import User from '../models/User.js';

// GET USER DATA USING USERID

export const getUserData = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false, message: 'User NOT Found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// UPDATE USER DATA

export const updateUserData = async (req, res) => {
  try {
    const { userId } = req.auth();
    let { username, bio, location, full_name } = req.body;

    const tempUser = await User.findById(userId);

    !username && (username = tempUser.username);

    if (tempUser.username !== username) {
      const user = await User.findOne({ username });
      if (user) {
        //  WE WILL NOT CHANGE THE USERNAME IF IT IS ALREADY TAKEN
        username = tempUser.username;
      }
    }

    let updatedData = {
      username,
      bio,
      location,
      full_name,
    };

    const profile = req.files.profile && req.files.profile[0];
    const cover = req.files.cover && req.files.cover[0];

    if (profile) {
      const buffer = fs.readFileSync(profile.path);
      const response = await imageKit.upload({
        file: buffer,
        fileName: profile.originalname,
      });
      const url = imageKit.url({
        path: response.filePath,
        transformation: [
          {
            quality: 'auto',
          },
          { width: 512 },
          { format: 'webp' },
        ],
      });
      updatedData.profile_picture = url;
    }

    if (cover) {
      const buffer = fs.readFileSync(cover.path);
      const response = await imageKit.upload({
        file: buffer,
        fileName: cover.originalname,
      });
      const url = imageKit.url({
        path: response.filePath,
        transformation: [
          {
            quality: 'auto',
          },
          { width: 1280 },
          { format: 'webp' },
        ],
      });
      updatedData.cover_photo = url;
    }

    const user = await User.findByIdAndUpdate(userId, updatedData, {
      new: true,
    });

    res.json({ success: true, user, message: 'Profile Updated Successfully' });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// FIND USERS USING USERNAME, EMAIL, LOCATION, NAME
export const discoverUsers = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { input } = req.body;

    const allUsers = await User.find({
      $or: [
        { username: new RegExp(input, 'i') },
        { email: new RegExp(input, 'i') },
        { full_name: new RegExp(input, 'i') },
        { location: new RegExp(input, 'i') },
      ],
    });
    const filteredUsers = allUsers.filter(user => user._id !== userId);

    res.json({ success: true, users: filteredUsers });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// FOLLOW USER

export const followUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const user = await User.findById(userId);

    if (user.following.includes(id)) {
      return res.json({
        success: false,
        message: 'You Are Already Following This User',
      });
    }

    user.following.push(id);

    await user.save();

    const toUser = await User.findById(id);
    toUser.followers.push(userId);
    await toUser.save();

    res.json({ success: true, message: 'Now You Are Following This User' });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// UNFOLLOW USER

export const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const user = await User.findById(userId);

    user.following = user.following.filter(user => user !== id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.followers = toUser.followers.filter(user => user !== userId);
    await toUser.save();

    res.json({
      success: true,
      message: 'You Are NO Longer Following This User',
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// SEND CONNECTION REQUEST

export const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    // CHECK IF USER HAS SENT MORE THAN 20 CONNECTIONS REQUESTS IN THE LAST 24 HOURS

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const connectionRequests = await Connection.find({
      from_user_id: userId,
      created_at: { $gt: last24Hours },
    });

    if (connectionRequests.length >= 20) {
      return res.json({
        success: false,
        message:
          'You Have Sent More Than 20 Connection Requests In The Last 24 Hours',
      });
    }

    // CHECK IF USERS ARE ALREADY CONNECTED

    const connection = await Connection.findOne({
      $or: [
        { from_user_id: userId, to_user_id: id },
        { from_user_id: id, to_user_id: userId },
      ],
    });

    if (!connection) {
      await Connection.create({
        from_user_id: userId,
        to_user_id: id,
      });
      return res.json({
        success: true,
        message: 'Connection Request Sent Successfully',
      });
    } else if (connection && connection.status === 'accepted') {
      return res.json({
        success: false,
        message: 'You Are Already Connected With This User',
      });
    }

    return res.json({
      success: false,
      message: 'Connection Request Pending',
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// GET USERS CONNECTIONS
export const getUsersConnections = async (req, res) => {
  try {
    const { userId } = req.auth();

    const user = await User.findById(userId).populate(
      'connections followers following'
    );

    const connections = user.connections;
    const followers = user.followers;
    const following = user.following;

    const pendingConnections = await Connection.find({
      to_user_id: userId,
      status: 'pending',
    })
      .populate('from_user_id')
      .map(connection => connection.from_user_id);

    return res.json({
      success: true,
      connections,
      followers,
      following,
      pendingConnections,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ACCEPT CONNECTION REQUEST

export const acceptConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const connection = await Connection.find({
      from_user_id: id,
      to_user_id: userId,
    });

    if (!connection) {
      res.json({ success: false, message: 'Connection Not Found' });
    }

    const user = await User.findById(userId);
    user.connections.push(id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.connections.push(userId);
    await toUser.save();

    connection.status = 'accepted';
    await connection.save();

    res.json({ success: true, message: 'Connection Accepted Successfully' });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
