import { httpServer, io } from './server.js';
import { handleConnection } from './handlers/connection.js';
import { handleMessages } from './handlers/message.js';
import { handleVoice } from './handlers/voice.js';
import { handleDisconnect } from './handlers/disconnect.js';
import { handleChannels } from './handlers/channel.js';
import { handleServers } from './handlers/server.js';

const PORT = process.env.PORT || 4000;

io.on('connection', (socket) => {
  console.log('🔌 Подключен:', socket.id);
  
  handleConnection(socket);
  handleMessages(socket);
  handleVoice(socket);
  handleChannels(socket);
  handleServers(socket);
  handleDisconnect(socket);
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔════════════════════════════╗
  ║  ⚛️  ATOMCORD ЗАПУЩЕН     ║
  ║  http://0.0.0.0:${PORT}    ║
  ╚════════════════════════════╝
  `);
});