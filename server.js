import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { serve } from 'inngest/express';
import connectDB from './configs/db.js';
import { functions, inngest } from './inngest/index.js';
// import { functions, inngest } from './inngest/index.js';

const app = express();
await connectDB(); //

app.use(express.json());

app.use(cors());

app.get('/', (req, res) => {
  res.send('Server Is Running');
});

// Set up the "/api/inngest" (recommended) routes with the serve handler
app.use('/api/inngest', serve({ client: inngest, functions }));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server Is Running on ${PORT}`));
