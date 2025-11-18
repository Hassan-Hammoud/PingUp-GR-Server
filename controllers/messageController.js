import fs from 'fs';
import imageKit from '../configs/imageKit.js';
import Message from './../models/Messages.js';

// CREATE AN EMPTY OBJECT TO STORE SERVER SIDE EVENT CONNECTIONS
const connections = {};

// CONTROLLER FUNCTION FOR THE SERVER SIDE EVENT(SSE) ENDPOINT
export const sseController = (req, res) => {
  const { userId } = req.params;
  console.log('New Client Connected: ', userId);

  // SET SSE HEADERS
  res.setHeader('Content-type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'Keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // ADD THE CLIENT'S RESPONSE OBJECT TO THE CONNECTIONS OBJECT
  connections[userId] = res;

  // SEND AN INITIAL EVENT TO THE CLIENT
  res.write('log:Connected to SSE stream\n\n');

  // HANDLE CLIENT DISCONNECTION
  res.on('close', () => {
    //REMOVE THE CLIENT'S RESPONSE OBJECT FROM THE CONNECTIONS ARRAY
    delete connections[userId];
    console.log('Client disconnected');
  });
};

// SEND MESSAGE

export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { to_user_id, text } = req.body;
    const image = req.file;

    let media_url = '';
    let message_type = image ? 'image' : 'text';

    if (message_type === 'image') {
      const fileBuffer = fs.readFileSync(image.path);
      const response = await imageKit.upload({
        file: fileBuffer,
        fileName: image.originalname,
      });
      media_url = imageKit.url({
        path: response.filePath,
        transformation: [
          {
            quality: 'auto',
          },
          { width: 1280 },
          { format: 'webp' },
        ],
      });
    }

    const message = await Message.create({
      from_user_id: userId,
      to_user_id,
      text,
      message_type,
      media_url,
    });
    res.json({ success: true, message });

    // SEND MESSAGE TO TO_USER_ID USING SSE

    const messageWithUserData = await Message.findById(message._id).populate(
      'from_user_id'
    );

    if (connections[to_user_id]) {
      connections[to_user_id].write(
        `data: ${JSON.stringify(messageWithUserData)}\n\n`
      );
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// GET CHAT MESSAGES
export const getChatMessages = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { to_user_id } = req.body;

    const messages = await Message.find({
      $or: [
        { from_user_id: userId, to_user_id },
        { from_user_id: to_user_id, to_user_id: userId },
      ],
    }).sort({ created_at: -1 });

    // MARK MESSAGE AS SEEN

    await Message.updateMany(
      { from_user_id: to_user_id, to_user_id: userId },
      { seen: true }
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// GET RECENT MESSAGES
export const getUserRecentMessages = async (req, res) => {
  try {
    const { userId } = req.auth();
    const messages = await Message.find({ to_user_id: userId })
      .populate('from_user_id to_user_id')
      .sort({ created_at: -1 });

    res.json({ success: true, messages });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
