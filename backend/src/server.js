import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', name: 'AtomCord' });
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    credentials: true
  }
});

export { app, httpServer, io };