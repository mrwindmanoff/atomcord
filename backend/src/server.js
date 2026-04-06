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

// В конец файла, перед экспортом
app.get('/api/invite/:code', (req, res) => {
  const { getInvite, getServer } = require('./store/invites.js');
  const invite = getInvite(req.params.code);
  
  if (!invite) {
    return res.json({ valid: false });
  }
  
  const server = getServer(invite.serverId);
  res.json({
    valid: true,
    serverId: invite.serverId,
    serverName: server?.name || 'Unknown'
  });
});
export { app, httpServer, io };