import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS настройки
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', name: 'AtomCord', timestamp: Date.now() });
});

app.get('/api/stats', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    node: process.version
  });
});

// Socket.IO (для чата)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// ========== WEBSOCKET ДЛЯ АУДИО ==========
const wss = new WebSocketServer({ server: httpServer, path: '/audio' });

// Хранилище комнат: roomId -> Set of WebSocket clients
const audioRooms = new Map();

wss.on('connection', (ws, req) => {
  console.log('🎧 Аудио WebSocket подключен');
  let currentRoom = null;
  let currentUser = null;
  
  ws.on('message', (data) => {
    try {
      // Пытаемся распарсить JSON (для команд)
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'join') {
        currentRoom = msg.roomId;
        currentUser = msg.userId;
        
        if (!audioRooms.has(currentRoom)) {
          audioRooms.set(currentRoom, new Map());
        }
        audioRooms.get(currentRoom).set(ws, { userId: currentUser });
        console.log(`👤 ${currentUser} присоединился к аудио комнате ${currentRoom}`);
        ws.send(JSON.stringify({ type: 'joined', roomId: currentRoom }));
      }
      
      if (msg.type === 'leave') {
        if (currentRoom && audioRooms.has(currentRoom)) {
          audioRooms.get(currentRoom).delete(ws);
          console.log(`👋 ${currentUser} покинул аудио комнату ${currentRoom}`);
        }
      }
      
    } catch (e) {
      // Это не JSON, значит бинарные аудио данные
      if (currentRoom && audioRooms.has(currentRoom)) {
        const clients = audioRooms.get(currentRoom);
        // Отправляем аудио всем в комнате, кроме отправителя
        for (const [client, info] of clients) {
          if (client !== ws && client.readyState === 1) {
            client.send(data);
          }
        }
      }
    }
  });
  
  ws.on('close', () => {
    if (currentRoom && audioRooms.has(currentRoom)) {
      audioRooms.get(currentRoom).delete(ws);
      console.log(`👋 Пользователь покинул аудио комнату ${currentRoom}`);
    }
  });
});

export { app, httpServer, io, wss };